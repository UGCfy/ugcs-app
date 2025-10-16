// app/config/permissions.js
// Granular permissions system for team members

export const PERMISSIONS = {
  // Media Management
  MEDIA_UPLOAD: {
    id: "media.upload",
    label: "Upload media",
    description: "Add new images and videos",
    category: "Media",
  },
  MEDIA_APPROVE: {
    id: "media.approve",
    label: "Approve/reject media",
    description: "Review and approve UGC content",
    category: "Media",
  },
  MEDIA_EDIT: {
    id: "media.edit",
    label: "Edit media",
    description: "Edit captions, tags, and product assignments",
    category: "Media",
  },
  MEDIA_DELETE: {
    id: "media.delete",
    label: "Delete media",
    description: "Permanently remove media items",
    category: "Media",
  },

  // Tags
  TAGS_MANAGE: {
    id: "tags.manage",
    label: "Manage tags",
    description: "Create, edit, and delete tags",
    category: "Tags",
  },

  // Widgets
  WIDGETS_CONFIGURE: {
    id: "widgets.configure",
    label: "Configure widgets",
    description: "Set up and customize widgets",
    category: "Widgets",
  },

  // Channels
  CHANNELS_CONNECT: {
    id: "channels.connect",
    label: "Connect channels",
    description: "Link Instagram, TikTok, etc.",
    category: "Channels",
  },
  CHANNELS_IMPORT: {
    id: "channels.import",
    label: "Import content",
    description: "Import posts from connected channels",
    category: "Channels",
  },

  // Analytics
  ANALYTICS_VIEW: {
    id: "analytics.view",
    label: "View analytics",
    description: "See performance metrics and reports",
    category: "Analytics",
  },

  // Team
  TEAM_MANAGE: {
    id: "team.manage",
    label: "Manage team",
    description: "Invite, remove, and manage team members",
    category: "Team",
  },

  // Billing
  BILLING_MANAGE: {
    id: "billing.manage",
    label: "Manage billing",
    description: "Change plans, view invoices, manage subscription",
    category: "Billing",
  },
};

// Permission presets for quick setup
export const PERMISSION_PRESETS = {
  VIEWER: {
    name: "Viewer",
    description: "View-only access",
    permissions: [
      PERMISSIONS.ANALYTICS_VIEW.id,
    ],
  },
  EDITOR: {
    name: "Editor",
    description: "Content management",
    permissions: [
      PERMISSIONS.MEDIA_UPLOAD.id,
      PERMISSIONS.MEDIA_APPROVE.id,
      PERMISSIONS.MEDIA_EDIT.id,
      PERMISSIONS.TAGS_MANAGE.id,
      PERMISSIONS.ANALYTICS_VIEW.id,
    ],
  },
  ADMIN: {
    name: "Admin",
    description: "Full content & team management",
    permissions: [
      PERMISSIONS.MEDIA_UPLOAD.id,
      PERMISSIONS.MEDIA_APPROVE.id,
      PERMISSIONS.MEDIA_EDIT.id,
      PERMISSIONS.MEDIA_DELETE.id,
      PERMISSIONS.TAGS_MANAGE.id,
      PERMISSIONS.WIDGETS_CONFIGURE.id,
      PERMISSIONS.CHANNELS_CONNECT.id,
      PERMISSIONS.CHANNELS_IMPORT.id,
      PERMISSIONS.ANALYTICS_VIEW.id,
      PERMISSIONS.TEAM_MANAGE.id,
    ],
  },
  OWNER: {
    name: "Owner",
    description: "Full access",
    permissions: Object.values(PERMISSIONS).map((p) => p.id),
  },
};

// Helper to check if user has a specific permission
export function hasPermission(userPermissions, permissionId) {
  if (!Array.isArray(userPermissions)) return false;
  return userPermissions.includes(permissionId);
}

// Helper to get permissions by category
export function getPermissionsByCategory() {
  const byCategory = {};
  
  Object.values(PERMISSIONS).forEach((perm) => {
    if (!byCategory[perm.category]) {
      byCategory[perm.category] = [];
    }
    byCategory[perm.category].push(perm);
  });
  
  return byCategory;
}

