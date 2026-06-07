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
    memberWhatsappInput,
    setMemberWhatsappInput,
    showWhatsappPrompt,
    setShowWhatsappPrompt,
    handleMemberUpdateWhatsapp,
    sessions,
    sessionBookings,
    getActiveSessionBookings,
    getSessionMemberBookingCount,
    getSessionWalkInCount,
    getSessionTotalParticipantCount,
    getSessionRemainingParticipantSlots,
    getSessionRemainingWalkInSlots,
    getSessionMemberWaitlist,
    getSessionWalkInWaitlist,
    handleBookSession,
    handleCancelSessionBooking,
    handleMemberUpdateBookingWalkIns,
    isPastCancelCutoff,
    minimumBookingBalance,
    walkInSelections,
    setWalkInSelections,
}) {
    const [showMemberMenu, setShowMemberMenu] = useState(false);
    const [memberReloadPage, setMemberReloadPage] = useState(1);
    const [memberTransactionPage, setMemberTransactionPage] = useState(1);
    const [expandedAttendeeSessions, setExpandedAttendeeSessions] = useState({});
    const [editingWalkInSessionId, setEditingWalkInSessionId] = useState(null);
    const [walkInEditValues, setWalkInEditValues] = useState({});

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
    const shouldShowWhatsappPrompt =
        showWhatsappPrompt &&
        (!String(memberData.whatsapp || "").trim() ||
            String(memberWhatsappInput || "").trim() !== "");

    const updateWalkInSelection = (sessionId, updates) => {
        setWalkInSelections((previousSelections) => {
            const currentSelection = previousSelections[sessionId] || {
                bringWalkIn: false,
                count: 1,
                names: [],
            };
            const nextSelection = {
                ...currentSelection,
                ...updates,
            };
            const nextCount = Math.max(1, Number(nextSelection.count || 1));

            return {
                ...previousSelections,
                [sessionId]: {
                    ...nextSelection,
                    count: nextCount,
                    names: Array.from({ length: nextCount }, (_, index) =>
                        nextSelection.names?.[index] || ""
                    ),
                },
            };
        });
    };

    const toggleAttendeeSession = (sessionId) => {
        setExpandedAttendeeSessions((previousSessions) => ({
            ...previousSessions,
            [sessionId]: !previousSessions[sessionId],
        }));
    };

    const getMemberName = (memberId) => {
        const member = members.find(
            (member) => Number(member.id) === Number(memberId)
        );

        return member?.name || "Unknown Member";
    };

    const isConfirmedBooking = (booking) =>
        booking.status !== "cancelled" &&
        booking.waitlistStatus !== "waiting" &&
        booking.waitlistStatus !== "removed";

    const startWalkInEdit = (booking) => {
        const count = Number(booking.walkInCount || 0);
        setEditingWalkInSessionId(booking.sessionId);
        setWalkInEditValues({
            count,
            names: Array.from({ length: count }, (_, index) =>
                booking.walkInNames?.[index] || ""
            ),
        });
    };

    const updateWalkInEditValue = (updates) => {
        setWalkInEditValues((previousValues) => {
            const nextValues = {
                count: Number(previousValues.count || 0),
                names: previousValues.names || [],
                ...updates,
            };
            const nextCount = Math.max(0, Number(nextValues.count || 0));

            return {
                count: nextCount,
                names: Array.from({ length: nextCount }, (_, index) =>
                    nextValues.names?.[index] || ""
                ),
            };
        });
    };

    const cancelWalkInEdit = () => {
        setEditingWalkInSessionId(null);
        setWalkInEditValues({});
    };

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

                            <button
                                onClick={() => {
                                    setShowMemberPasswordPanel(false);
                                    setShowMemberLoginIdPanel(false);
                                    setMemberWhatsappInput(memberData.whatsapp || "");
                                    setShowWhatsappPrompt(true);
                                    setShowMemberMenu(false);
                                }}
                            >
                                Update WhatsApp Number
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

                {shouldShowWhatsappPrompt && (
                    <div className="panel whatsapp-prompt-panel">
                        <div className="panel-header">
                            <div>
                                <h2>Add WhatsApp Number</h2>
                                <p>
                                    Add your WhatsApp number to receive booking and payment reminders.
                                </p>
                            </div>
                        </div>

                        <label>WhatsApp Number</label>
                        <input
                            type="text"
                            placeholder="Example: 0142889116"
                            value={memberWhatsappInput}
                            onChange={(event) => setMemberWhatsappInput(event.target.value)}
                        />

                        <div className="button-row">
                            <button className="action-button" onClick={handleMemberUpdateWhatsapp}>
                                Save WhatsApp Number
                            </button>

                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setMemberWhatsappInput("");
                                    setShowWhatsappPrompt(false);
                                }}
                            >
                                Skip for now
                            </button>
                        </div>
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
                                    const memberBookingCount = getSessionMemberBookingCount(session.id);
                                    const walkInCount = getSessionWalkInCount(session.id);
                                    const totalParticipantCount =
                                        getSessionTotalParticipantCount(session.id);
                                    const remainingParticipantSlots =
                                        getSessionRemainingParticipantSlots(session.id);
                                    const remainingWalkInSlots =
                                        getSessionRemainingWalkInSlots(session.id);
                                    const memberWaitlistCount =
                                        getSessionMemberWaitlist(session.id).length;
                                    const walkInWaitlistCount =
                                        getSessionWalkInWaitlist(session.id).length;
                                    const confirmedBookings = (sessionBookings || []).filter(
                                        (booking) =>
                                            Number(booking.sessionId) === Number(session.id) &&
                                            isConfirmedBooking(booking)
                                    );
                                    const memberWaitlist = (sessionBookings || []).filter(
                                        (booking) =>
                                            Number(booking.sessionId) === Number(session.id) &&
                                            booking.waitlistType === "member" &&
                                            booking.waitlistStatus === "waiting"
                                    );
                                    const walkInWaitlist = (sessionBookings || []).filter(
                                        (booking) =>
                                            Number(booking.sessionId) === Number(session.id) &&
                                            booking.waitlistType === "walkin" &&
                                            booking.waitlistStatus === "waiting"
                                    );
                                    const walkInLimit = Number(session.walkInLimit ?? 5);
                                    const walkInSelection = walkInSelections[session.id] || {
                                        bringWalkIn: false,
                                        count: 1,
                                        names: [],
                                    };

                                    const myBooking = (sessionBookings || []).find(
                                        (booking) =>
                                            Number(booking.sessionId) === Number(session.id) &&
                                            Number(booking.memberId) === Number(currentUser.memberId) &&
                                            booking.status !== "cancelled" &&
                                            booking.waitlistStatus !== "removed"
                                    );

                                    const isFull = remainingParticipantSlots <= 0;
                                    const isAttendeeExpanded =
                                        Boolean(expandedAttendeeSessions[session.id]);
                                    const isMyConfirmedBooking =
                                        myBooking && isConfirmedBooking(myBooking);
                                    const isEditingWalkIns =
                                        Number(editingWalkInSessionId) === Number(session.id);
                                    const editableRemainingParticipantSlots =
                                        remainingParticipantSlots +
                                        Number(myBooking?.walkInCount || 0);
                                    const editableRemainingWalkInSlots =
                                        remainingWalkInSlots +
                                        Number(myBooking?.walkInCount || 0);
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

                                                <div className="session-capacity-summary">
                                                    <div className="capacity-summary-item">
                                                        <span className="capacity-summary-label">Members</span>
                                                        <strong className="capacity-summary-value">
                                                            {memberBookingCount}
                                                        </strong>
                                                    </div>

                                                    <div className="capacity-summary-item">
                                                        <span className="capacity-summary-label">Walk-ins</span>
                                                        <strong className="capacity-summary-value">
                                                            {walkInCount}/{walkInLimit}
                                                        </strong>
                                                    </div>

                                                    <div className="capacity-summary-item">
                                                        <span className="capacity-summary-label">Total</span>
                                                        <strong className="capacity-summary-value">
                                                            {totalParticipantCount}/{session.maxPlayers}
                                                        </strong>
                                                    </div>

                                                    <div
                                                        className={`capacity-summary-item ${
                                                            remainingParticipantSlots <= 0 ? "is-full" : ""
                                                        }`}
                                                    >
                                                        <span className="capacity-summary-label">Remaining</span>
                                                        <strong className="capacity-summary-value">
                                                            {remainingParticipantSlots <= 0
                                                                ? "Full"
                                                                : remainingParticipantSlots}
                                                        </strong>
                                                    </div>

                                                    <div className="capacity-summary-item capacity-summary-wide">
                                                        <span className="capacity-summary-label">Waitlist</span>
                                                        <strong className="capacity-summary-value">
                                                            Member {memberWaitlistCount}, Walk-in {walkInWaitlistCount}
                                                        </strong>
                                                    </div>
                                                </div>

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
                                                    <div className="my-booking-summary">
                                                        <p>
                                                            Your Status:{" "}
                                                            <span className="positive">
                                                                {myBooking.waitlistStatus === "waiting"
                                                                    ? "WAITING LIST"
                                                                    : myBooking.status.toUpperCase()}
                                                            </span>
                                                        </p>

                                                        {isMyConfirmedBooking &&
                                                            Number(myBooking.walkInCount || 0) > 0 && (
                                                                <p>
                                                                    Your Walk-ins:{" "}
                                                                    <strong>{myBooking.walkInCount}</strong>
                                                                    <br />
                                                                    <span className="attendee-meta">
                                                                        Names:{" "}
                                                                        {(myBooking.walkInNames || []).join(", ")}
                                                                    </span>
                                                                </p>
                                                            )}

                                                        {isMyConfirmedBooking &&
                                                            Number(myBooking.lateCancelledWalkInCount || 0) > 0 && (
                                                                <p>
                                                                    Late cancelled walk-in:{" "}
                                                                    <strong>
                                                                        {myBooking.lateCancelledWalkInCount}
                                                                    </strong>
                                                                    <br />
                                                                    <span className="attendee-meta">
                                                                        Names:{" "}
                                                                        {(myBooking.lateCancelledWalkInNames || []).join(", ")}
                                                                    </span>
                                                                </p>
                                                            )}
                                                    </div>
                                                )}

                                                {!myBooking && (
                                                    <div className="walkin-option">
                                                        <label className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(walkInSelection.bringWalkIn)}
                                                                onChange={(event) =>
                                                                    updateWalkInSelection(session.id, {
                                                                        bringWalkIn: event.target.checked,
                                                                    })
                                                                }
                                                            />
                                                            Bring walk-in guest
                                                        </label>

                                                        {walkInSelection.bringWalkIn && (
                                                            <>
                                                                <div className="walkin-input-row">
                                                                    <label>Walk-in count</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max={Math.max(1, Math.min(5, remainingWalkInSlots || 5))}
                                                                        value={walkInSelection.count}
                                                                        onChange={(event) =>
                                                                            updateWalkInSelection(session.id, {
                                                                                count: event.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="walkin-name-grid">
                                                                    {Array.from(
                                                                        { length: Number(walkInSelection.count || 1) },
                                                                        (_, index) => (
                                                                            <div key={index}>
                                                                                <label>
                                                                                    Walk-in Guest {index + 1} Name
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={walkInSelection.names?.[index] || ""}
                                                                                    onChange={(event) => {
                                                                                        const names = [
                                                                                            ...(walkInSelection.names || []),
                                                                                        ];
                                                                                        names[index] = event.target.value;
                                                                                        updateWalkInSelection(session.id, {
                                                                                            names,
                                                                                        });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
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

                                                {isMyConfirmedBooking && isEditingWalkIns && (
                                                    <div className="walkin-edit-panel">
                                                        <div className="walkin-edit-header">
                                                            <div>
                                                                <h4>Update Walk-in Guests</h4>
                                                                <p>
                                                                    Remaining total slots:{" "}
                                                                    <strong>{editableRemainingParticipantSlots}</strong>
                                                                    {" · "}
                                                                    Remaining walk-in slots:{" "}
                                                                    <strong>{editableRemainingWalkInSlots}</strong>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="walkin-input-row">
                                                            <label>Walk-in count</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={walkInEditValues.count ?? 0}
                                                                onChange={(event) =>
                                                                    updateWalkInEditValue({
                                                                        count: event.target.value,
                                                                    })
                                                                }
                                                            />
                                                        </div>

                                                        {Number(walkInEditValues.count || 0) > 0 && (
                                                            <div className="walkin-name-grid">
                                                                {Array.from(
                                                                    { length: Number(walkInEditValues.count || 0) },
                                                                    (_, index) => (
                                                                        <div key={index}>
                                                                            <label>
                                                                                Walk-in Guest {index + 1} Name
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={walkInEditValues.names?.[index] || ""}
                                                                                onChange={(event) => {
                                                                                    const names = [
                                                                                        ...(walkInEditValues.names || []),
                                                                                    ];
                                                                                    names[index] = event.target.value;
                                                                                    updateWalkInEditValue({ names });
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="button-row">
                                                            <button
                                                                className="action-button"
                                                                onClick={async () => {
                                                                    const success =
                                                                        await handleMemberUpdateBookingWalkIns(
                                                                            session.id,
                                                                            walkInEditValues.count || 0,
                                                                            walkInEditValues.names || []
                                                                        );

                                                                    if (success) {
                                                                        cancelWalkInEdit();
                                                                    }
                                                                }}
                                                            >
                                                                Save Walk-in Guests
                                                            </button>

                                                            <button
                                                                className="secondary-button"
                                                                onClick={cancelWalkInEdit}
                                                            >
                                                                Cancel Edit
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {isAttendeeExpanded && (
                                                    <div className="attendee-panel">
                                                        <h4>Attendees</h4>

                                                        <div className="attendee-section">
                                                            <h5>Confirmed Members</h5>
                                                            {confirmedBookings.length === 0 ? (
                                                                <p className="waitlist-muted-text">
                                                                    No confirmed attendees yet.
                                                                </p>
                                                            ) : (
                                                                confirmedBookings.map((booking) => (
                                                                    <div key={booking.id} className="attendee-row">
                                                                        <div>
                                                                            <span className="attendee-name">
                                                                                {getMemberName(booking.memberId)}
                                                                            </span>
                                                                            <span className="attendee-meta">
                                                                                {String(booking.status || "booked").replace("_", " ")}
                                                                            </span>
                                                                        </div>

                                                                        {Number(booking.walkInCount || 0) > 0 && (
                                                                            <div className="walkin-name-list">
                                                                                <strong>
                                                                                    Walk-in: {booking.walkInCount}
                                                                                </strong>
                                                                                <span>
                                                                                    {(booking.walkInNames || []).join(", ")}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {Number(booking.lateCancelledWalkInCount || 0) > 0 && (
                                                                            <div className="walkin-name-list">
                                                                                <strong>
                                                                                    Late cancelled walk-in:{" "}
                                                                                    {booking.lateCancelledWalkInCount}
                                                                                </strong>
                                                                                <span>
                                                                                    {(booking.lateCancelledWalkInNames || []).join(", ")}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        <div className="attendee-section">
                                                            <h5>Member Waiting List</h5>
                                                            {memberWaitlist.length === 0 ? (
                                                                <p className="waitlist-muted-text">
                                                                    No member waitlist.
                                                                </p>
                                                            ) : (
                                                                memberWaitlist.map((booking) => (
                                                                    <div key={booking.id} className="attendee-row">
                                                                        <span className="attendee-name">
                                                                            {getMemberName(booking.memberId)}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        <div className="attendee-section">
                                                            <h5>Walk-in Waiting List</h5>
                                                            {walkInWaitlist.length === 0 ? (
                                                                <p className="waitlist-muted-text">
                                                                    No walk-in waitlist.
                                                                </p>
                                                            ) : (
                                                                walkInWaitlist.map((booking) => (
                                                                    <div key={booking.id} className="attendee-row">
                                                                        <div>
                                                                            <span className="attendee-name">
                                                                                {getMemberName(booking.memberId)}
                                                                            </span>
                                                                            <span className="attendee-meta">
                                                                                Walk-in: {booking.walkInCount || 0}
                                                                            </span>
                                                                        </div>
                                                                        <div className="walkin-name-list">
                                                                            <span>
                                                                                {(booking.walkInNames || []).join(", ")}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="member-session-actions">
                                                <button
                                                    className="secondary-button"
                                                    onClick={() => toggleAttendeeSession(session.id)}
                                                >
                                                    {isAttendeeExpanded
                                                        ? "Hide Attendees"
                                                        : "View Attendees"}
                                                </button>

                                                {!myBooking ? (
                                                    <button
                                                        className="action-button"
                                                        disabled={belowMinimumBookingBalance}
                                                        onClick={() => handleBookSession(session.id)}
                                                    >
                                                        {belowMinimumBookingBalance
                                                                ? "Need Reload"
                                                            : isFull
                                                                ? "Join Waitlist"
                                                                : "Book Now"}
                                                    </button>
                                                ) : (
                                                    <>
                                                        {isMyConfirmedBooking && (
                                                            <button
                                                                className="secondary-button"
                                                                onClick={() => startWalkInEdit(myBooking)}
                                                            >
                                                                {Number(myBooking.walkInCount || 0) > 0
                                                                    ? "Update Walk-in Guests"
                                                                    : "Add Walk-in Guests"}
                                                            </button>
                                                        )}

                                                        <button
                                                            className="secondary-button"
                                                            onClick={() => handleCancelSessionBooking(session.id)}
                                                        >
                                                            Cancel Booking
                                                        </button>
                                                    </>
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
