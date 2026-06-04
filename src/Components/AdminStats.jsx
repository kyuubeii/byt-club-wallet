function AdminStats({
  totalClubBalance,
  activeMemberCount,
  pendingRequestCount,
  negativeBalanceCount,
  formatMoney,
}) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <p>Total Club Balance</p>
        <h3>{formatMoney(totalClubBalance)}</h3>
      </div>

      <div className="stat-card">
        <p>Active Members</p>
        <h3>{activeMemberCount}</h3>
      </div>

      <div className="stat-card">
        <p>Pending Reload</p>
        <h3>{pendingRequestCount}</h3>
      </div>

      <div className="stat-card danger">
        <p>Negative Balance</p>
        <h3>{negativeBalanceCount}</h3>
      </div>
    </div>
  );
}

export default AdminStats;