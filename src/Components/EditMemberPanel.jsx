function EditMemberPanel({
  editMemberBalance,
  editMemberEmail,
  editMemberName,
  editMemberStatus,
  editMemberWhatsapp,
  editingMemberId,
  handleCancelEditMember,
  handleDeactivateMember,
  handleApproveMember,
  handleReactivateMember,
  handleResetMemberPassword,
  handleUpdateMemberInfo,
  newPassword,
  selectedMember,
  setEditMemberBalance,
  setEditMemberEmail,
  setEditMemberName,
  setEditMemberStatus,
  setEditMemberWhatsapp,
  setNewPassword,
}) {
  return (
    <div className="edit-member-panel">
      <div className="edit-member-heading">
        <div>
          <h2>Edit Member</h2>
          <p>
            {selectedMember
              ? `${selectedMember.name} #${editingMemberId}`
              : "Selected member"}
          </p>
        </div>

        <button className="secondary-button compact-button" onClick={handleCancelEditMember}>
          Cancel Edit
        </button>
      </div>

      <div className="edit-member-grid">
        <div>
          <label>Member Name</label>
          <input
            type="text"
            placeholder="Member name"
            value={editMemberName}
            onChange={(event) => setEditMemberName(event.target.value)}
          />
        </div>

        <div>
          <label>Login ID / Email</label>
          <input
            type="text"
            placeholder="Member login ID or email"
            value={editMemberEmail}
            onChange={(event) => setEditMemberEmail(event.target.value)}
          />
        </div>

        <div>
          <label>Balance</label>
          <input
            type="number"
            placeholder="Example: 100 or -50"
            value={editMemberBalance}
            onChange={(event) => setEditMemberBalance(event.target.value)}
          />
        </div>

        <div>
          <label>Status</label>
          <select
            value={editMemberStatus}
            onChange={(event) => setEditMemberStatus(event.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div>
          <label>WhatsApp Number</label>
          <input
            type="text"
            placeholder="Example: 60142889116"
            value={editMemberWhatsapp}
            onChange={(event) => setEditMemberWhatsapp(event.target.value)}
          />
        </div>
      </div>

      <label>New Password</label>
      <input
        type="text"
        placeholder="Example: 123456"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />

      <button className="secondary-button" onClick={handleResetMemberPassword}>
        Reset Password
      </button>

      <div className="button-row">
        <button
          className="action-button add-member-button"
          onClick={handleUpdateMemberInfo}
        >
          Update Member
        </button>

        {selectedMember?.status === "pending" && (
          <button className="approve-button" onClick={handleApproveMember}>
            Approve Member
          </button>
        )}

        <button className="reactivate-button" onClick={handleReactivateMember}>
          Reactivate Member
        </button>

        <button className="danger-button" onClick={handleDeactivateMember}>
          Deactivate Member
        </button>

        <button className="secondary-button" onClick={handleCancelEditMember}>
          Cancel Edit
        </button>
      </div>
    </div>
  );
}

export default EditMemberPanel;
