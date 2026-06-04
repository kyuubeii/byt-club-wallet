import { useState } from "react";
import TopBar from "./TopBar.jsx";

function MemberPortal({
    currentUser,
    users,
    members,
    reloadRequests,
    transactions,
    showTopUpBox,
    setShowTopUpBox,
    topUpAmount,
    setTopUpAmount,
    setPaymentScreenshot,
    isSubmittingReloadRequest,
    handleSubmitReloadRequest,
    handleLogout,
    formatMoney,
    memberOldPassword,
    setMemberOldPassword,
    memberNewPassword,
    setMemberNewPassword,
    memberConfirmPassword,
    setMemberConfirmPassword,
    handleMemberChangePassword,
    showMemberPasswordPanel,
    setShowMemberPasswordPanel,
    memberNewLoginId,
    setMemberNewLoginId,
    memberLoginIdPassword,
    setMemberLoginIdPassword,
    handleMemberChangeLoginId,
    showMemberLoginIdPanel,
    setShowMemberLoginIdPanel,
    sessions,
    sessionBookings,
    getActiveSessionBookings,
    handleBookSession,
    handleCancelSessionBooking,
    isPastCancelCutoff,
    minimumBookingBalance,
}) {
    const [showMemberMenu, setShowMemberMenu] = useState(false);
    const [memberReloadPage, setMemberReloadPage] = useState(1);
    const [memberTransactionPage, setMemberTransactionPage] = useState(1);

    const memberData = members.find(
        (member) => Number(member.id) === Number(currentUser.memberId)
    );
    const currentLoginUser = users.find(
        (user) => user.id === currentUser.id
    );
    const currentLoginId = currentLoginUser?.email || currentUser.email;
    const closeMemberPasswordPanel = () => {
        setMemberOldPassword("");
        setMemberNewPassword("");
        setMemberConfirmPassword("");
        setShowMemberPasswordPanel(false);
    };
    const closeMemberLoginIdPanel = () => {
        setMemberNewLoginId("");
        setMemberLoginIdPassword("");
        setShowMemberLoginIdPanel(false);
    };

    if (!memberData) {
        return (
            <div className="dashboard-page">
                <div className="topbar">
                    <div>
                        <h2>BYT Club Wallet</h2>
                        <p>Member Portal</p>
                    </div>

                    <div className="member-menu">
                        <button
                            className="secondary-button"
                            onClick={() => setShowMemberMenu(!showMemberMenu)}
                        >
                            Menu
                        </button>

                        {showMemberMenu && (
                            <div className="member-menu-dropdown">
                                <button
                                    onClick={() => {
                                        setShowMemberPasswordPanel(true);
                                        setShowMemberLoginIdPanel(false);
                                        setShowMemberMenu(false);
                                    }}
                                >
                                    Change Password
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMemberPasswordPanel(false);
                                        setShowMemberLoginIdPanel(true);
                                        setShowMemberMenu(false);
                                    }}
                                >
                                    Change Login ID
                                </button>

                                <button onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="dashboard-content">
                    <div className="panel">
                        <h2>Member profile not found</h2>
                        <p className="empty-text">
                            Please contact admin to check your member account.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const myReloadRequests = reloadRequests.filter(
        (request) => request.memberId === memberData.id
    );

    const myTransactions = transactions.filter(
        (transaction) => transaction.memberId === memberData.id
    );
    const memberReloadPageSize = 5;
    const memberTransactionPageSize = 10;
    const sortedReloadRequests = [...myReloadRequests].sort(
        (a, b) => Number(b.id || 0) - Number(a.id || 0)
    );
    const sortedTransactions = [...myTransactions].sort(
        (a, b) => Number(b.id || 0) - Number(a.id || 0)
    );
    const memberReloadTotalPages = Math.max(
        1,
        Math.ceil(sortedReloadRequests.length / memberReloadPageSize)
    );
    const memberTransactionTotalPages = Math.max(
        1,
        Math.ceil(sortedTransactions.length / memberTransactionPageSize)
    );
    const safeMemberReloadPage = Math.min(
        memberReloadPage,
        memberReloadTotalPages
    );
    const safeMemberTransactionPage = Math.min(
        memberTransactionPage,
        memberTransactionTotalPages
    );
    const paginatedReloadRequests = sortedReloadRequests.slice(
        (safeMemberReloadPage - 1) * memberReloadPageSize,
        safeMemberReloadPage * memberReloadPageSize
    );
    const paginatedTransactions = sortedTransactions.slice(
        (safeMemberTransactionPage - 1) * memberTransactionPageSize,
        safeMemberTransactionPage * memberTransactionPageSize
    );
    const belowMinimumBookingBalance =
        Number(memberData.balance) < minimumBookingBalance;

    return (
        <div className="dashboard-page">
            <div className="topbar">
                <div>
                    <h2>BYT Club Wallet</h2>
                    <p>Member Portal</p>
                </div>

                <div className="member-menu">
                    <button
                        className="secondary-button"
                        onClick={() => setShowMemberMenu(!showMemberMenu)}
                    >
                        Menu
                    </button>

                    {showMemberMenu && (
                        <div className="member-menu-dropdown">
                            <button
                                onClick={() => {
                                    setShowMemberPasswordPanel(true);
                                    setShowMemberLoginIdPanel(false);
                                    setShowMemberMenu(false);
                                }}
                            >
                                Change Password
                            </button>

                            <button
                                onClick={() => {
                                    setShowMemberPasswordPanel(false);
                                    setShowMemberLoginIdPanel(true);
                                    setShowMemberMenu(false);
                                }}
                            >
                                Change Login ID
                            </button>

                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-content">
                <h1>Welcome, {currentUser.name}</h1>
                <p className="dashboard-subtitle">
                    View your balance and submit reload proof.
                </p>

                {currentLoginUser?.password === "123456" && (
                    <div className="default-password-warning">
                        <strong>Security Reminder:</strong> You are still using the default password.
                        Please change your password from the menu.
                    </div>
                )}

                {showMemberLoginIdPanel && (
                    <div className="panel change-login-id-panel">
                        <div className="panel-header">
                            <div>
                                <h2>Change Login ID</h2>
                                <p>Update the Login ID you use to sign in.</p>
                            </div>

                            <button
                                className="secondary-button"
                                onClick={closeMemberLoginIdPanel}
                            >
                                Close
                            </button>
                        </div>

                        <label>Current Login ID</label>
                        <div className="current-login-id">{currentLoginId}</div>

                        <label>New Login ID</label>
                        <input
                            type="text"
                            placeholder="Enter new Login ID"
                            value={memberNewLoginId}
                            onChange={(event) => setMemberNewLoginId(event.target.value)}
                        />

                        <label>Current Password</label>
                        <input
                            type="password"
                            placeholder="Enter current password"
                            value={memberLoginIdPassword}
                            onChange={(event) => setMemberLoginIdPassword(event.target.value)}
                        />

                        <div className="change-login-id-actions">
                            <button className="action-button" onClick={handleMemberChangeLoginId}>
                                Save Login ID
                            </button>

                            <button className="secondary-button" onClick={closeMemberLoginIdPanel}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {showMemberPasswordPanel && (
                    <div className="panel change-password-panel">
                        <div className="panel-header">
                            <div>
                                <h2>Change Password</h2>
                                <p>Update your account password.</p>
                            </div>

                            <button
                                className="secondary-button"
                                onClick={closeMemberPasswordPanel}
                            >
                                Close
                            </button>
                        </div>
                        <label>Current Password</label>
                        <input
                            type="password"
                            placeholder="Enter current password"
                            value={memberOldPassword}
                            onChange={(event) => setMemberOldPassword(event.target.value)}
                        />

                        <label>New Password</label>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            value={memberNewPassword}
                            onChange={(event) => setMemberNewPassword(event.target.value)}
                        />

                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={memberConfirmPassword}
                            onChange={(event) => setMemberConfirmPassword(event.target.value)}
                        />

                        <button className="action-button" onClick={handleMemberChangePassword}>
                            Change Password
                        </button>
                    </div>
                )}

                <div className="member-card">
                    <p>Current Balance</p>

                    <h3
                        className={
                            memberData.balance < 0 ? "negative-text" : "positive-text"
                        }
                    >
                        {formatMoney(memberData.balance)}
                    </h3>

                    <span className="status-badge">
                        {memberData.balance < 0
                            ? "Need Reload"
                            : memberData.balance < 30
                                ? "Low Balance"
                                : "Good"}
                    </span>

                    <button
                        className="topup-button"
                        onClick={() => setShowTopUpBox(!showTopUpBox)}
                    >
                        Need Top Up
                    </button>
                </div>

                {showTopUpBox && (
                    <div className="panel topup-panel">
                        <h2>Reload Payment Details</h2>

                        <div className="bank-box">
                            <p>
                                <strong>Bank Name:</strong> United Overseas Bank
                            </p>
                            <p>
                                <strong>Account Name:</strong> B.Y.T. Enterprise
                            </p>
                            <p>
                                <strong>Account Number:</strong> 2383066532
                            </p>
                            <p>
                                <strong>Reference:</strong> Your Name
                            </p>
                        </div>

                        <div className="qr-box qr-image-box">
                            <img
                                src="/duitnow-qr.png"
                                alt="DuitNow QR Code"
                                className="duitnow-qr-image"
                            />
                            <span>Scan to reload</span>
                        </div>

                        <label>Top Up Amount</label>
                        <input
                            type="number"
                            placeholder="Example: 100"
                            value={topUpAmount}
                            onChange={(event) => setTopUpAmount(event.target.value)}
                        />

                        <label>Upload Payment Screenshot</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => setPaymentScreenshot(event.target.files[0])}
                        />

                        <button
                            className="action-button"
                            disabled={isSubmittingReloadRequest}
                            onClick={handleSubmitReloadRequest}
                        >
                            {isSubmittingReloadRequest ? "Submitting..." : "Submit Reload Proof"}
                        </button>
                    </div>
                )}

                <div className="panel member-session-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Available Sessions</h2>
                            <p>Book your badminton session here.</p>
                        </div>
                    </div>

                    {(sessions || []).filter(
                        (session) => String(session.status).trim().toLowerCase() === "open"
                    ).length === 0 ? (
                        <p className="empty-text">No open session available now.</p>
                    ) : (
                        <div className="member-session-list">
                            {(sessions || [])
                                .filter(
                                    (session) => String(session.status).trim().toLowerCase() === "open"
                                )
                                .map((session) => {
                                    const activeBookings = getActiveSessionBookings(session.id);

                                    const myBooking = (sessionBookings || []).find(
                                        (booking) =>
                                            booking.sessionId === session.id &&
                                            Number(booking.memberId) === Number(currentUser.memberId) &&
                                            booking.status !== "cancelled"
                                    );

                                    const isFull = activeBookings.length >= session.maxPlayers;
                                    const pastCutoff = isPastCancelCutoff(session);

                                    const estimatedCourtFee =
                                        activeBookings.length > 0
                                            ? session.courtFeeTotal / activeBookings.length
                                            : session.courtFeeTotal;

                                    return (
                                        <div key={session.id} className="member-session-card">
                                            <div>
                                                <h3>{session.date}</h3>
                                                <p>
                                                    {session.time} · {session.venue}
                                                </p>

                                                <p>
                                                    Players:{" "}
                                                    <strong>
                                                        {activeBookings.length}/{session.maxPlayers}
                                                    </strong>
                                                </p>

                                                <p>
                                                    Court Fee Total:{" "}
                                                    <strong>{formatMoney(session.courtFeeTotal)}</strong>
                                                </p>

                                                <p>
                                                    Estimated Court Fee:{" "}
                                                    <strong>{formatMoney(estimatedCourtFee)}</strong>
                                                </p>

                                                <p>
                                                    Cancel Cutoff: <strong>{session.cancelCutoff}</strong>
                                                </p>

                                                {myBooking && (
                                                    <p>
                                                        Your Status:{" "}
                                                        <span className="positive">
                                                            {myBooking.status.toUpperCase()}
                                                        </span>
                                                    </p>
                                                )}

                                                {!myBooking && isFull && (
                                                    <p className="negative">This session is full.</p>
                                                )}

                                                {!myBooking && belowMinimumBookingBalance && (
                                                    <div className="booking-warning">
                                                        Minimum balance required to book:{" "}
                                                        {formatMoney(minimumBookingBalance)}. Please reload
                                                        before booking.
                                                    </div>
                                                )}

                                                {myBooking && pastCutoff && (
                                                    <p className="negative">
                                                        Cancel cutoff passed. Court fee may still be charged.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="member-session-actions">
                                                {!myBooking ? (
                                                    <button
                                                        className="action-button"
                                                        disabled={isFull || belowMinimumBookingBalance}
                                                        onClick={() => handleBookSession(session.id)}
                                                    >
                                                        {isFull
                                                            ? "Full"
                                                            : belowMinimumBookingBalance
                                                                ? "Need Reload"
                                                                : "Book Now"}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="secondary-button"
                                                        onClick={() => handleCancelSessionBooking(session.id)}
                                                    >
                                                        Cancel Booking
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                <div className="panel">
                    <h2>My Reload Requests</h2>

                    {myReloadRequests.length === 0 ? (
                        <p className="empty-text">No reload request submitted yet.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Screenshot</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {paginatedReloadRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td>{request.date}</td>
                                        <td className="positive">{formatMoney(request.amount)}</td>
                                        <td>
                                            <a
                                                href={request.screenshotUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <img
                                                    src={request.screenshotUrl}
                                                    alt="Payment Screenshot"
                                                    className="payment-preview"
                                                />
                                            </a>
                                        </td>
                                        <td>{request.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {sortedReloadRequests.length > memberReloadPageSize && (
                        <div className="pagination-controls">
                            <button
                                className="pagination-button"
                                disabled={safeMemberReloadPage === 1}
                                onClick={() => setMemberReloadPage(safeMemberReloadPage - 1)}
                            >
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {safeMemberReloadPage} of {memberReloadTotalPages}
                            </span>
                            <button
                                className="pagination-button"
                                disabled={safeMemberReloadPage === memberReloadTotalPages}
                                onClick={() => setMemberReloadPage(safeMemberReloadPage + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                <div className="panel">
                    <h2>My Recent Transactions</h2>

                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedTransactions.map((transaction) => (
                                <tr key={transaction.id}>
                                    <td>{transaction.date}</td>
                                    <td>{transaction.description}</td>
                                    <td
                                        className={
                                            transaction.amount < 0 ? "negative" : "positive"
                                        }
                                    >
                                        {formatMoney(transaction.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {sortedTransactions.length > memberTransactionPageSize && (
                        <div className="pagination-controls">
                            <button
                                className="pagination-button"
                                disabled={safeMemberTransactionPage === 1}
                                onClick={() =>
                                    setMemberTransactionPage(safeMemberTransactionPage - 1)
                                }
                            >
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {safeMemberTransactionPage} of{" "}
                                {memberTransactionTotalPages}
                            </span>
                            <button
                                className="pagination-button"
                                disabled={
                                    safeMemberTransactionPage === memberTransactionTotalPages
                                }
                                onClick={() =>
                                    setMemberTransactionPage(safeMemberTransactionPage + 1)
                                }
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MemberPortal;
