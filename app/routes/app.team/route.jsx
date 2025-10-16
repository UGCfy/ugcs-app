// app/routes/app.team/route.jsx
import { useState } from "react";
import { useLoaderData, useActionData, Form } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import { PERMISSIONS, PERMISSION_PRESETS, getPermissionsByCategory } from "../../config/permissions";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // Fetch all team members
  const members = await prisma.teamMember.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const permissionsByCategory = getPermissionsByCategory();

  return { members, permissionsByCategory, presets: PERMISSION_PRESETS };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Invite new member
  if (intent === "invite") {
    const email = formData.get("email");
    const name = formData.get("name");
    
    // Get all checked permissions
    const permissions = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("perm_") && value === "on") {
        permissions.push(key.substring(5)); // Remove "perm_" prefix
      }
    }

    if (!email || !email.includes("@")) {
      return { error: "Valid email address required" };
    }

    if (permissions.length === 0) {
      return { error: "Please select at least one permission" };
    }

    // Check if member already exists
    const existing = await prisma.teamMember.findUnique({
      where: { email },
    });

    if (existing) {
      return { error: "This email is already invited or active" };
    }

    // Create team member with permissions
    await prisma.teamMember.create({
      data: {
        email,
        name: name || null,
        role: "ADMIN", // Keep role for backward compatibility, but use permissions
        permissions,
        isActive: false,
      },
    });

    return { success: `Invitation sent to ${email} with ${permissions.length} permissions!` };
  }

  // Update member permissions
  if (intent === "updatePermissions") {
    const memberId = formData.get("memberId");
    
    // Get all checked permissions
    const permissions = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("perm_") && value === "on") {
        permissions.push(key.substring(5));
      }
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { permissions },
    });

    return { success: "Permissions updated successfully" };
  }

  // Toggle active status
  if (intent === "toggleActive") {
    const memberId = formData.get("memberId");
    const currentStatus = formData.get("isActive") === "true";

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { isActive: !currentStatus },
    });

    return { success: currentStatus ? "Member deactivated" : "Member activated" };
  }

  // Remove member
  if (intent === "remove") {
    const memberId = formData.get("memberId");

    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    return { success: "Member removed from team" };
  }

  return { error: "Unknown action" };
};

// Permission Checkboxes Component
/* eslint-disable react/prop-types */
function PermissionCheckboxes({ selectedPermissions, onChange, disabled }) {
  const permsByCategory = getPermissionsByCategory();
  
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {Object.entries(permsByCategory).map(([category, perms]) => (
        <div key={category}>
          <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {category}
          </h4>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {perms.map((perm) => (
              <label
                key={perm.id}
                htmlFor={`perm-${perm.id}`}
                aria-label={perm.label}
                style={{
                  display: "flex",
                  alignItems: "start",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  background: selectedPermissions.includes(perm.id) ? "#e3f2fd" : "#f9f9f9",
                  border: `1px solid ${selectedPermissions.includes(perm.id) ? "#16acf1" : "#e0e0e0"}`,
                  borderRadius: "6px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  id={`perm-${perm.id}`}
                  name={`perm_${perm.id}`}
                  checked={selectedPermissions.includes(perm.id)}
                  onChange={(e) => {
                    if (disabled) return;
                    if (e.target.checked) {
                      onChange([...selectedPermissions, perm.id]);
                    } else {
                      onChange(selectedPermissions.filter((p) => p !== perm.id));
                    }
                  }}
                  disabled={disabled}
                  style={{
                    width: "18px",
                    height: "18px",
                    marginTop: "2px",
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "500", fontSize: "0.9rem" }}>{perm.label}</div>
                  <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.125rem" }}>
                    {perm.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
/* eslint-enable react/prop-types */

export default function TeamPage() {
  const { members, presets } = useLoaderData();
  const actionData = useActionData();
  
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);

  // Apply preset
  const applyPreset = (presetName) => {
    const preset = presets[presetName];
    if (preset) {
      setSelectedPermissions(preset.permissions);
    }
  };

  const applyPresetForEdit = (presetName) => {
    const preset = presets[presetName];
    if (preset) {
      setEditPermissions(preset.permissions);
    }
  };

  const startEditing = (member) => {
    setEditingMemberId(member.id);
    setEditPermissions(member.permissions || []);
  };

  const cancelEditing = () => {
    setEditingMemberId(null);
    setEditPermissions([]);
  };

  return (
    <s-page heading="Team Management">
      <s-section>
        <s-paragraph>
          Invite team members and customize their permissions. Give each person exactly the access they need.
        </s-paragraph>
      </s-section>

      {/* Success/Error Messages */}
      {actionData?.success && (
        <s-section variant="success">
          <s-paragraph>{actionData.success}</s-paragraph>
        </s-section>
      )}

      {actionData?.error && (
        <s-section variant="critical">
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-section>
      )}

      {/* Invite New Member */}
      <s-section heading="Invite Team Member">
        <Form method="post" style={{ maxWidth: "800px" }}>
          <input type="hidden" name="intent" value="invite" />
          
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {/* Member Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label htmlFor="member-email" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  Email Address *
                </label>
                <input
                  id="member-email"
                  type="email"
                  name="email"
                  placeholder="colleague@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div>
                <label htmlFor="member-name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  Name (optional)
                </label>
                <input
                  id="member-name"
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <div style={{ marginBottom: "0.75rem", fontSize: "0.9rem", fontWeight: "500" }}>
                Quick Presets:
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {Object.entries(presets).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#f0f0f0",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "500",
                    }}
                  >
                    {preset.name} ({preset.permissions.length} permissions)
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedPermissions([])}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "white",
                    border: "1px solid #dc3545",
                    color: "#dc3545",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div style={{ marginBottom: "0.75rem", fontSize: "0.9rem", fontWeight: "500" }}>
                Select Permissions ({selectedPermissions.length} selected):
              </div>
              <PermissionCheckboxes
                selectedPermissions={selectedPermissions}
                onChange={setSelectedPermissions}
                disabled={false}
              />
            </div>

            <button
              type="submit"
              disabled={selectedPermissions.length === 0}
              style={{
                padding: "0.75rem 1.5rem",
                background: selectedPermissions.length === 0 ? "#ccc" : "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: selectedPermissions.length === 0 ? "not-allowed" : "pointer",
                fontWeight: "500",
              }}
            >
              Send Invitation
            </button>
          </div>
        </Form>
      </s-section>

      {/* Team Members List */}
      <s-section heading="Team Members">
        {members.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#666", background: "#f9f9f9", borderRadius: "8px" }}>
            <p style={{ margin: 0, fontSize: "1.1rem" }}>No team members yet</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>Invite your first team member using the form above</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  background: "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "1.5rem",
                }}
              >
                {/* Member Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>
                      {member.name || member.email}
                    </div>
                    {member.name && (
                      <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.125rem" }}>
                        {member.email}
                      </div>
                    )}
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {member.isActive ? (
                        <span style={{ display: "inline-block", padding: "0.25rem 0.75rem", background: "#d4edda", color: "#155724", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }}>
                          ✓ Active
                        </span>
                      ) : member.joinedAt ? (
                        <span style={{ display: "inline-block", padding: "0.25rem 0.75rem", background: "#fff3cd", color: "#856404", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }}>
                          Inactive
                        </span>
                      ) : (
                        <span style={{ display: "inline-block", padding: "0.25rem 0.75rem", background: "#d1ecf1", color: "#0c5460", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }}>
                          ⏳ Pending
                        </span>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "#999" }}>
                        Invited {new Date(member.invitedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {member.role !== "OWNER" && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Form method="post" style={{ display: "inline" }}>
                        <input type="hidden" name="intent" value="toggleActive" />
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="isActive" value={member.isActive.toString()} />
                        <button
                          type="submit"
                          style={{
                            padding: "0.5rem 0.75rem",
                            background: member.isActive ? "#fff3cd" : "#d4edda",
                            color: member.isActive ? "#856404" : "#155724",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "500",
                          }}
                        >
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </Form>

                      <Form method="post" style={{ display: "inline" }}>
                        <input type="hidden" name="intent" value="remove" />
                        <input type="hidden" name="memberId" value={member.id} />
                        <button
                          type="submit"
                          onClick={(e) => {
                            if (!confirm(`Remove ${member.email} from the team?`)) {
                              e.preventDefault();
                            }
                          }}
                          style={{
                            padding: "0.5rem 0.75rem",
                            background: "white",
                            color: "#dc3545",
                            border: "1px solid #dc3545",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "500",
                          }}
                        >
                          Remove
                        </button>
                      </Form>
                    </div>
                  )}
                </div>

                {/* Permissions Display/Edit */}
                {editingMemberId === member.id ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="updatePermissions" />
                    <input type="hidden" name="memberId" value={member.id} />
                    
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: "500" }}>
                        Quick Presets:
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {Object.entries(presets).map(([key, preset]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => applyPresetForEdit(key)}
                            style={{
                              padding: "0.375rem 0.75rem",
                              background: "#f0f0f0",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <PermissionCheckboxes
                      selectedPermissions={editPermissions}
                      onChange={setEditPermissions}
                      disabled={false}
                    />

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                      <button
                        type="submit"
                        style={{
                          padding: "0.5rem 1rem",
                          background: "#008060",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "500",
                        }}
                      >
                        Save Permissions
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        style={{
                          padding: "0.5rem 1rem",
                          background: "#f0f0f0",
                          color: "#333",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </Form>
                ) : (
                  <>
                    <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "#666" }}>
                      Permissions ({member.permissions?.length || 0}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                      {member.permissions && member.permissions.length > 0 ? (
                        member.permissions.map((permId) => {
                          const perm = Object.values(PERMISSIONS).find((p) => p.id === permId);
                          return perm ? (
                            <span
                              key={permId}
                              style={{
                                display: "inline-block",
                                padding: "0.375rem 0.75rem",
                                background: "#e3f2fd",
                                color: "#1976d2",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                fontWeight: "500",
                              }}
                            >
                              {perm.label}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span style={{ color: "#999", fontSize: "0.875rem", fontStyle: "italic" }}>
                          No permissions assigned
                        </span>
                      )}
                    </div>
                    {member.role !== "OWNER" && (
                      <button
                        type="button"
                        onClick={() => startEditing(member)}
                        style={{
                          padding: "0.5rem 1rem",
                          background: "#f0f0f0",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: "500",
                        }}
                      >
                        Edit Permissions
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </s-section>

      {/* Team Stats */}
      {members.length > 0 && (
        <s-section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>Total Members</div>
              <div style={{ fontSize: "2rem", fontWeight: "700", color: "#5c6ac4" }}>{members.length}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>Active</div>
              <div style={{ fontSize: "2rem", fontWeight: "700", color: "#008060" }}>
                {members.filter((m) => m.isActive).length}
              </div>
            </div>
            <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>Pending</div>
              <div style={{ fontSize: "2rem", fontWeight: "700", color: "#f49342" }}>
                {members.filter((m) => !m.joinedAt).length}
              </div>
            </div>
          </div>
        </s-section>
      )}

      {/* Best Practices */}
      <s-section>
        <div style={{ background: "#e3f2fd", padding: "1.5rem", borderRadius: "8px", border: "1px solid #90caf9" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>💡 Permission Best Practices</h3>
          <ul style={{ margin: 0, paddingLeft: "1.5rem", lineHeight: "1.8", fontSize: "0.875rem", color: "#1976d2" }}>
            <li>
              <strong>Start minimal:</strong> Give only the permissions needed for their role
            </li>
            <li>
              <strong>Review regularly:</strong> Audit permissions when team members change roles
            </li>
            <li>
              <strong>Billing & Team:</strong> Keep these limited to 1-2 trusted people
            </li>
            <li>
              <strong>Use presets:</strong> Click &ldquo;Editor&rdquo; or &ldquo;Admin&rdquo; for common setups, then customize
            </li>
          </ul>
        </div>
      </s-section>
    </s-page>
  );
}
