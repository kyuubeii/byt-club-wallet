function TopBar({
  title,
  subtitle,
  onLogout,
  showResetButton = false,
  onReset,
}) {
  return (
    <div className="topbar">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        {showResetButton && (
          <button className="reset-button" onClick={onReset}>
            Reset Demo Data
          </button>
        )}

        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default TopBar;