function MemberTable({ filteredMembers, formatMoney, onEditMember }) {
  return (
    <div className="member-table-scroll">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredMembers.map((member) => (
            <tr key={member.id}>
              <td>{member.name}</td>

              <td className={member.balance < 0 ? "negative" : "positive"}>
                {formatMoney(member.balance)}
              </td>

              <td>
                {member.status === "inactive"
                  ? "Inactive"
                  : member.status === "pending"
                  ? "Pending Approval"
                  : member.balance < 0
                  ? "Need Reload"
                  : member.balance < 30
                  ? "Low Balance"
                  : "Good"}
              </td>

              <td>
                <button
                  className="member-edit-button"
                  onClick={() => onEditMember(member.id)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MemberTable;
