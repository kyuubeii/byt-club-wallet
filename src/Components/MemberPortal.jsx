import { useState } from "react";

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
    getSessionConfirmedIndependentWalkins,
    getSessionWaitingIndependentWalkins,
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
    const [paymentProofFileName, setPaymentProofFileName] = useState("");

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
                <div className="topbar member-topbar">
                    <div>
                        <h2>BYT Club Wallet</h2>
                        <p>Member Portal</p>
                    </div>

                    <div className="member-menu">
                        <button
                            className="secondary-button member-menu-button"
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
    const memberBalance = Number(memberData.balance || 0);
    const balanceHealth =
        memberBalance < 15
            ? {
                key: "critical",
                label: "Critical",
                message: "Reload before booking",
            }
            : memberBalance < 30
                ? {
                    key: "low",
                    label: "Low",
                    message: "Reload soon",
                }
                : memberBalance < 100
                    ? {
                        key: "good",
                        label: "Good",
                        message: "Ready to play",
                    }
                    : {
                        key: "great",
                        label: "Great",
                        message: "Fully ready",
                    };
    const belowMinimumBookingBalance =
        memberBalance < minimumBookingBalance;
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
            <div className="topbar member-topbar">
                <div>
                    <h2>BYT Club Wallet</h2>
                    <p>Member Portal</p>
                </div>

                <div className="member-menu">
                    <button
                        className="secondary-button member-menu-button"
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

                <div className={`member-card member-balance-card balance-health-${balanceHealth.key}`}>
                    <div className="balance-card-header">
                        <p>Current Balance</p>
                        <span className="status-badge balance-health-badge">
                            {balanceHealth.label}
                        </span>
                    </div>

                    <h3>
                        {formatMoney(memberData.balance)}
                    </h3>

                    <p className="balance-health-message">
                        {balanceHealth.message}
                    </p>

                    <div
                        className={`balance-health-meter balance-health-meter-${balanceHealth.key}`}
                        aria-hidden="true"
                    >
                        <span />
                    </div>

                    <button
                        className="topup-button"
                        onClick={() => setShowTopUpBox(!showTopUpBox)}
                    >
                        Reload
                    </button>
                </div>

                {showTopUpBox && (
                    <div className="panel topup-panel">
                        <div className="member-panel-heading">
                            <h2>Reload Payment Details</h2>
                            <p>Scan, transfer, then upload your payment proof.</p>
                        </div>

                        <div className="reload-payment-grid">
                            <div className="bank-box reload-bank-card">
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

                            <div className="qr-box qr-image-box reload-qr-card">
                                <img
                                    src="/duitnow-qr.png"
                                    alt="DuitNow QR Code"
                                    className="duitnow-qr-image"
                                />
                                <span>Scan to reload</span>
                            </div>
                        </div>

                        <div className="reload-upload-card">
                            <label>Top Up Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                placeholder="Example: 100"
                                value={topUpAmount}
                                onChange={(event) => setTopUpAmount(event.target.value)}
                            />

                            <label>Upload Payment Screenshot</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                    const file = event.target.files[0] || null;
                                    setPaymentScreenshot(file);
                                    setPaymentProofFileName(file?.name || "");
                                }}
                            />

                            {paymentProofFileName && (
                                <p className="proof-selected-feedback">
                                    Proof selected: <strong>{paymentProofFileName}</strong>
                                </p>
                            )}

                            <button
                                className="action-button reload-submit-button"
                                disabled={isSubmittingReloadRequest}
                                onClick={handleSubmitReloadRequest}
                            >
                                {isSubmittingReloadRequest ? "Submitting..." : "Submit Reload Proof"}
                            </button>
                        </div>
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
                                        getSessionWalkInWaitlist(session.id).length +
                                        getSessionWaitingIndependentWalkins(session.id).length;
                                    const confirmedBookings = (sessionBookings || []).filter(
                                        (booking) =>
                                            Number(booking.sessionId) === Number(session.id) &&
                                            isConfirmedBooking(booking)
                                    );
                                    const confirmedWalkIns = confirmedBookings
                                        .flatMap((booking) =>
                                            (booking.walkInNames || [])
                                                .slice(0, Number(booking.walkInCount || 0))
                                                .map((name, index) => ({
                                                    id: `${booking.id}-walkin-${index}`,
                                                    name: String(name || "").trim(),
                                                }))
                                        )
                                        .filter((walkin) => walkin.name !== "");
                                    const confirmedIndependentWalkIns =
                                        getSessionConfirmedIndependentWalkins(session.id).map(
                                            (walkin) => ({
                                                id: `independent-${walkin.id}`,
                                                name: walkin.name,
                                            })
                                        );
                                    const attendeeWalkIns = [
                                        ...confirmedWalkIns,
                                        ...confirmedIndependentWalkIns,
                                    ];
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
                                    const independentWalkInWaitlist =
                                        getSessionWaitingIndependentWalkins(session.id);
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
                                    const sessionCapacityClass = isFull
                                        ? "is-full-session"
                                        : remainingParticipantSlots <= 3
                                            ? "is-low-slots"
                                            : "is-open-session";
                                    const sessionStatusLabel = myBooking
                                        ? "Your Booking"
                                        : isFull
                                            ? "Full / Waitlist"
                                            : remainingParticipantSlots <= 3
                                                ? "Low Slots"
                                                : "Open";
                                    const myBookingStatusLabel =
                                        myBooking?.waitlistStatus === "waiting"
                                            ? "WAITING LIST"
                                            : myBooking?.status?.toUpperCase();
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
                                        <div
                                            key={session.id}
                                            className={`member-session-card ${sessionCapacityClass}`}
                                        >
                                            <div className="member-session-main">
                                                <div className="member-session-header">
                                                    <div className="member-session-title-block">
                                                        <span className="member-session-eyebrow">Session</span>
                                                        <h3>{session.date}</h3>
                                                        <p className="member-session-meta">
                                                            <span>{session.time}</span>
                                                            <span>{session.venue}</span>
                                                        </p>
                                                    </div>

                                                    <span className={`member-session-state ${sessionCapacityClass}`}>
                                                        {sessionStatusLabel}
                                                    </span>
                                                </div>

                                                <div className="session-capacity-summary">
                                                    <div className="capacity-summary-item">
                                                        <span className="capacity-summary-label">Booked</span>
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
                                                            remainingParticipantSlots <= 0
                                                                ? "is-full"
                                                                : remainingParticipantSlots <= 3
                                                                    ? "is-low"
                                                                    : ""
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

                                                <div className="member-session-detail-grid">
                                                    <div>
                                                        <span>Court Fee Total</span>
                                                        <strong>{formatMoney(session.courtFeeTotal)}</strong>
                                                    </div>

                                                    <div>
                                                        <span>Estimated Court Fee</span>
                                                        <strong>{formatMoney(estimatedCourtFee)}</strong>
                                                    </div>

                                                    <div>
                                                        <span>Cancel Cutoff</span>
                                                        <strong>{session.cancelCutoff}</strong>
                                                    </div>
                                                </div>

                                                {myBooking && (
                                                    <div className="my-booking-summary">
                                                        <div className="my-booking-summary-header">
                                                            <div>
                                                                <span className="member-session-eyebrow">Your Booking</span>
                                                                <strong>{session.date}</strong>
                                                            </div>

                                                            <span className="member-booking-status-chip">
                                                                {myBookingStatusLabel}
                                                            </span>
                                                        </div>

                                                        {isMyConfirmedBooking &&
                                                            Number(myBooking.walkInCount || 0) > 0 && (
                                                                <div className="my-booking-detail">
                                                                    <span>Your Walk-ins</span>
                                                                    <strong>{myBooking.walkInCount}</strong>
                                                                    <small>
                                                                        Names:{" "}
                                                                        {(myBooking.walkInNames || []).join(", ")}
                                                                    </small>
                                                                </div>
                                                            )}

                                                        {isMyConfirmedBooking &&
                                                            Number(myBooking.lateCancelledWalkInCount || 0) > 0 && (
                                                                <div className="my-booking-detail is-warning">
                                                                    <span>Late cancelled walk-in</span>
                                                                    <strong>
                                                                        {myBooking.lateCancelledWalkInCount}
                                                                    </strong>
                                                                    <small>
                                                                        Names:{" "}
                                                                        {(myBooking.lateCancelledWalkInNames || []).join(", ")}
                                                                    </small>
                                                                </div>
                                                            )}
                                                    </div>
                                                )}

                                                {!myBooking && (
                                                    <div className="walkin-option">
                                                        <div className="walkin-option-copy">
                                                            <strong>Add guest</strong>
                                                            <span>Bring a walk-in guest with your booking.</span>
                                                        </div>

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
                                                    <p className="session-state-note is-full">
                                                        This session is full. You can join the waitlist.
                                                    </p>
                                                )}

                                                {!myBooking && belowMinimumBookingBalance && (
                                                    <div className="booking-warning">
                                                        Minimum balance required to book:{" "}
                                                        {formatMoney(minimumBookingBalance)}. Please reload
                                                        before booking.
                                                    </div>
                                                )}

                                                {myBooking && pastCutoff && (
                                                    <p className="booking-warning booking-warning-soft">
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
                                                        <div className="attendee-panel-header">
                                                            <h4>Attendees</h4>
                                                            <span>
                                                                {confirmedBookings.length + attendeeWalkIns.length} confirmed
                                                            </span>
                                                        </div>

                                                        <div className="attendee-section member-attendee-section">
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

                                                        <div className="attendee-section member-attendee-section">
                                                            <h5>Walk-ins</h5>
                                                            {attendeeWalkIns.length === 0 ? (
                                                                <p className="waitlist-muted-text">
                                                                    No confirmed walk-ins.
                                                                </p>
                                                            ) : (
                                                                attendeeWalkIns.map((walkin) => (
                                                                    <div key={walkin.id} className="attendee-row">
                                                                        <span className="attendee-name">
                                                                            {walkin.name}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        <div className="attendee-section member-attendee-section">
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

                                                        <div className="attendee-section member-attendee-section">
                                                            <h5>Walk-in Waiting List</h5>
                                                            {walkInWaitlist.length === 0 &&
                                                            independentWalkInWaitlist.length === 0 ? (
                                                                <p className="waitlist-muted-text">
                                                                    No walk-in waitlist.
                                                                </p>
                                                            ) : (
                                                                <>
                                                                    {walkInWaitlist.map((booking) => (
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
                                                                    ))}
                                                                    {independentWalkInWaitlist.map((walkin) => (
                                                                        <div
                                                                            key={`independent-waiting-${walkin.id}`}
                                                                            className="attendee-row"
                                                                        >
                                                                            <span className="attendee-name">
                                                                                {walkin.name}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="member-session-actions">
                                                <button
                                                    className="secondary-button member-session-secondary-action"
                                                    onClick={() => toggleAttendeeSession(session.id)}
                                                >
                                                    {isAttendeeExpanded
                                                        ? "Hide Attendees"
                                                        : "View Attendees"}
                                                </button>

                                                {!myBooking ? (
                                                    <button
                                                        className="action-button member-session-primary-action"
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
                                                                className="secondary-button member-session-secondary-action"
                                                                onClick={() => startWalkInEdit(myBooking)}
                                                            >
                                                                {Number(myBooking.walkInCount || 0) > 0
                                                                    ? "Update Walk-in Guests"
                                                                    : "Add Walk-in Guests"}
                                                            </button>
                                                        )}

                                                        <button
                                                            className="secondary-button member-session-cancel-action"
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

                <div className="panel member-history-panel member-reload-history-panel">
                    <div className="member-panel-heading">
                        <h2>My Reload Requests</h2>
                        <p>Track your submitted reload proofs.</p>
                    </div>

                    {myReloadRequests.length === 0 ? (
                        <p className="empty-text">No reload request submitted yet.</p>
                    ) : (
                        <div className="member-history-table-wrap">
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
                        </div>
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

                <div className="panel member-history-panel member-transaction-history-panel">
                    <div className="member-panel-heading">
                        <h2>My Recent Transactions</h2>
                        <p>Recent wallet movement from reloads and session charges.</p>
                    </div>

                    {sortedTransactions.length === 0 ? (
                        <p className="empty-text">No recent transaction yet.</p>
                    ) : (
                        <div className="member-history-table-wrap">
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
                        </div>
                    )}

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
