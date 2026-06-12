import { useState } from "react";

function AdminBookingManagement({
  bookingStatusOptions,
  formatMoney,
  getSessionConfirmedBookings,
  getSessionBookings,
  getSessionMemberBookingCount,
  getSessionMemberWaitlist,
  getSessionChargeSummary,
  getSessionConfirmedIndependentWalkins,
  getSessionIndependentWalkins,
  getSessionRemainingParticipantSlots,
  getSessionTotalParticipantCount,
  getSessionWaitingIndependentWalkins,
  getSessionWalkInCount,
  getSessionWalkInWaitlist,
  handleAdminAddMemberToSession,
  handleAddIndependentWalkins,
  handleCancelIndependentWalkin,
  handleCloseSession,
  handleCreateSession,
  handleFinalizeSessionCharge,
  handleOpenSession,
  handlePromoteIndependentWalkin,
  handlePromoteWaitlistBooking,
  handleRemoveIndependentWalkin,
  handleRemoveWaitlistBooking,
  handleBulkUpdateSessionBookingStatus,
  handleUpdateBookingStatus,
  handleUpdateBookingWalkIns,
  handleUpdateSessionChargeField,
  members,
  newSessionCancelCutoff,
  newSessionCourtCount,
  newSessionCourtFeeTotal,
  newSessionDate,
  newSessionMaxPlayers,
  newSessionTime,
  newSessionVenue,
  newSessionWalkInLimit,
  sessions,
  setNewSessionCancelCutoff,
  setNewSessionCourtCount,
  setNewSessionCourtFeeTotal,
  setNewSessionDate,
  setNewSessionMaxPlayers,
  setNewSessionTime,
  setNewSessionVenue,
  setNewSessionWalkInLimit,
  users = [],
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [bookingSearchBySession, setBookingSearchBySession] = useState({});
  const [sessionHistoryPage, setSessionHistoryPage] = useState(1);
  const [walkinDraftsBySession, setWalkinDraftsBySession] = useState({});
  const [walkinStatusBySession, setWalkinStatusBySession] = useState({});
  const [adminMemberBySession, setAdminMemberBySession] = useState({});
  const [adminMemberModeBySession, setAdminMemberModeBySession] = useState({});
  const [attendeesBySession, setAttendeesBySession] = useState({});

  const activeSessions = sessions.filter(
    (session) => session.chargeStatus !== "charged"
  );
  const historySessions = sessions
    .filter((session) => session.chargeStatus === "charged")
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  const sessionHistoryPageSize = 5;
  const sessionHistoryTotalPages = Math.max(
    1,
    Math.ceil(historySessions.length / sessionHistoryPageSize)
  );
  const safeSessionHistoryPage = Math.min(
    sessionHistoryPage,
    sessionHistoryTotalPages
  );
  const paginatedHistorySessions = historySessions.slice(
    (safeSessionHistoryPage - 1) * sessionHistoryPageSize,
    safeSessionHistoryPage * sessionHistoryPageSize
  );

  function getWalkinDrafts(sessionId) {
    return walkinDraftsBySession[sessionId] || [""];
  }

  function updateWalkinDraft(sessionId, index, value) {
    setWalkinDraftsBySession((previousDrafts) => {
      const currentDrafts = previousDrafts[sessionId] || [""];
      const nextDrafts = currentDrafts.map((name, nameIndex) =>
        nameIndex === index ? value : name
      );

      return {
        ...previousDrafts,
        [sessionId]: nextDrafts,
      };
    });
  }

  function addWalkinDraft(sessionId) {
    setWalkinDraftsBySession((previousDrafts) => ({
      ...previousDrafts,
      [sessionId]: [...(previousDrafts[sessionId] || [""]), ""],
    }));
  }

  function removeWalkinDraft(sessionId, index) {
    setWalkinDraftsBySession((previousDrafts) => {
      const currentDrafts = previousDrafts[sessionId] || [""];
      const nextDrafts = currentDrafts.filter(
        (_, nameIndex) => nameIndex !== index
      );

      return {
        ...previousDrafts,
        [sessionId]: nextDrafts.length > 0 ? nextDrafts : [""],
      };
    });
  }

  async function submitIndependentWalkins(sessionId) {
    const names = getWalkinDrafts(sessionId);
    const status = walkinStatusBySession[sessionId] || "confirmed";
    const didAdd = await handleAddIndependentWalkins(sessionId, names, status);

    if (didAdd) {
      setWalkinDraftsBySession((previousDrafts) => ({
        ...previousDrafts,
        [sessionId]: [""],
      }));
    }
  }

  async function submitAdminMember(sessionId) {
    const memberId = adminMemberBySession[sessionId] || "";
    const addMode = adminMemberModeBySession[sessionId] || "confirmed";
    const didAdd = await handleAdminAddMemberToSession(
      sessionId,
      memberId,
      addMode
    );

    if (didAdd) {
      setAdminMemberBySession((previousMembers) => ({
        ...previousMembers,
        [sessionId]: "",
      }));
      setAdminMemberModeBySession((previousModes) => ({
        ...previousModes,
        [sessionId]: "confirmed",
      }));
    }
  }

  function getMemberName(memberId) {
    const member = members.find(
      (member) => Number(member.id) === Number(memberId)
    );

    return member?.name || "Unknown Member";
  }

  function toggleAttendees(sessionId) {
    setAttendeesBySession((previousSessions) => ({
      ...previousSessions,
      [sessionId]: !previousSessions[sessionId],
    }));
  }

  function renderSessionCard(session) {
    const confirmedBookings = getSessionConfirmedBookings(session.id);
    const allBookings = getSessionBookings(session.id);
    const chargeSummary = getSessionChargeSummary(session, allBookings);
    const isCharged = session.chargeStatus === "charged";
    const canManageIndependentWalkins =
      !isCharged && session.status === "open";
    const canAdminAddMember = !isCharged;
    const activeMembers = members.filter((member) => member.status === "active");
    const memberBookingCount = getSessionMemberBookingCount(session.id);
    const walkInCount = getSessionWalkInCount(session.id);
    const totalParticipantCount = getSessionTotalParticipantCount(session.id);
    const remainingParticipantSlots = getSessionRemainingParticipantSlots(session.id);
    const memberWaitlist = getSessionMemberWaitlist(session.id);
    const walkInWaitlist = getSessionWalkInWaitlist(session.id);
    const independentWalkins = getSessionIndependentWalkins(session.id);
    const confirmedIndependentWalkins =
      getSessionConfirmedIndependentWalkins(session.id);
    const waitingIndependentWalkins =
      getSessionWaitingIndependentWalkins(session.id);
    const cancelledIndependentWalkins = independentWalkins.filter(
      (walkin) => walkin.status === "cancelled"
    );
    const visibleIndependentWalkins = [
      ...confirmedIndependentWalkins,
      ...cancelledIndependentWalkins,
    ];
    const confirmedMemberAttachedWalkins = confirmedBookings
      .flatMap((booking) =>
        (booking.walkInNames || [])
          .slice(0, Number(booking.walkInCount || 0))
          .map((name, index) => ({
            id: `${booking.id}-walkin-${index}`,
            name: String(name || "").trim(),
          }))
      )
      .filter((walkin) => walkin.name !== "");
    const attendeeWalkins = [
      ...confirmedMemberAttachedWalkins,
      ...confirmedIndependentWalkins.map((walkin) => ({
        id: `independent-${walkin.id}`,
        name: walkin.name,
      })),
    ];
    const walkInLimit = Number(session.walkInLimit ?? 5);
    const independentWalkinDrafts = getWalkinDrafts(session.id);
    const independentWalkinStatus =
      walkinStatusBySession[session.id] || "confirmed";
    const selectedAdminMemberId = adminMemberBySession[session.id] || "";
    const adminMemberAddMode =
      adminMemberModeBySession[session.id] || "confirmed";
    const bookingSearch = bookingSearchBySession[session.id] || "";
    const normalizedBookingSearch = bookingSearch.trim().toLowerCase();
    const bookingStatusCounts = bookingStatusOptions.reduce((counts, option) => {
      counts[option.value] = confirmedBookings.filter(
        (booking) => booking.status === option.value
      ).length;
      return counts;
    }, {});
    const visibleBookings = confirmedBookings.filter((booking) => {
      if (!normalizedBookingSearch) {
        return true;
      }

      const member = members.find(
        (member) => Number(member.id) === Number(booking.memberId)
      );
      const user = users.find(
        (user) => Number(user.memberId) === Number(booking.memberId)
      );
      const searchableText = [
        member?.name,
        member?.email,
        user?.name,
        user?.email,
        user?.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedBookingSearch);
    });
    const hasBookedBookings = confirmedBookings.some(
      (booking) => booking.status === "booked" && booking.waitlistStatus !== "waiting"
    );
    const hasNonCancelledBookings = confirmedBookings.some(
      (booking) => booking.status !== "cancelled" && booking.waitlistStatus !== "waiting"
    );
    const isAttendeeExpanded = Boolean(attendeesBySession[session.id]);

    return (
      <div key={session.id} className="session-card">
        <div>
          <h3>{session.date}</h3>
          <p>
            {session.time} · {session.venue}
          </p>
          <p>
            Courts: <strong>{session.courtCount}</strong> · Players:{" "}
            <strong>
              {totalParticipantCount}/{session.maxPlayers}
            </strong>
          </p>
          <div className="walkin-summary">
            <span>Members: {memberBookingCount}</span>
            <span>Walk-ins: {walkInCount}/{walkInLimit}</span>
            <span>Total Participants: {totalParticipantCount}/{session.maxPlayers}</span>
            <span>Remaining Slots: {remainingParticipantSlots}</span>
            <span>Member Waitlist: {memberWaitlist.length}</span>
            <span>
              Walk-in Waitlist:{" "}
              {walkInWaitlist.length + waitingIndependentWalkins.length}
            </span>
          </div>
          <p>
            Court Fee Total:{" "}
            <strong>{formatMoney(session.courtFeeTotal)}</strong>
          </p>
          <p>
            Cancel Cutoff: <strong>{session.cancelCutoff}</strong>
          </p>
          <p>
            Status:{" "}
            <span
              className={session.status === "open" ? "positive" : "negative"}
            >
              {session.status.toUpperCase()}
            </span>
          </p>
          <p>
            Charge Status:{" "}
            <span className={isCharged ? "positive" : "negative"}>
              {(session.chargeStatus || "not_charged")
                .replace("_", " ")
                .toUpperCase()}
            </span>
          </p>
        </div>

        <div className="session-card-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => toggleAttendees(session.id)}
          >
            {isAttendeeExpanded ? "Hide Attendees" : "View Attendees"}
          </button>

          {isCharged ? (
            <span className="positive">Charged and closed</span>
          ) : session.status === "open" ? (
            <button
              className="secondary-button"
              onClick={() => handleCloseSession(session.id)}
            >
              Close Booking
            </button>
          ) : (
            <button
              className="secondary-button"
              onClick={() => handleOpenSession(session.id)}
            >
              Open Booking
            </button>
          )}
        </div>

        {isAttendeeExpanded && (
          <div className="attendee-panel admin-attendee-panel">
            <h4>Attendees</h4>

            <div className="attendee-section">
              <h5>Confirmed Members</h5>
              {confirmedBookings.length === 0 ? (
                <p className="waitlist-muted-text">No confirmed attendees yet.</p>
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
                  </div>
                ))
              )}
            </div>

            <div className="attendee-section">
              <h5>Walk-ins</h5>
              {attendeeWalkins.length === 0 ? (
                <p className="waitlist-muted-text">No confirmed walk-ins.</p>
              ) : (
                attendeeWalkins.map((walkin) => (
                  <div key={walkin.id} className="attendee-row">
                    <span className="attendee-name">{walkin.name}</span>
                  </div>
                ))
              )}
            </div>

            <div className="attendee-section">
              <h5>Member Waiting List</h5>
              {memberWaitlist.length === 0 ? (
                <p className="waitlist-muted-text">No member waitlist.</p>
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
              {walkInWaitlist.length === 0 && waitingIndependentWalkins.length === 0 ? (
                <p className="waitlist-muted-text">No walk-in waitlist.</p>
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
                        <span>{(booking.walkInNames || []).join(", ")}</span>
                      </div>
                    </div>
                  ))}
                  {waitingIndependentWalkins.map((walkin) => (
                    <div
                      key={`independent-waiting-${walkin.id}`}
                      className="attendee-row"
                    >
                      <span className="attendee-name">{walkin.name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {canManageIndependentWalkins && (
          <div className="admin-walkin-section">
            <div className="admin-walkin-header">
              <div>
                <h4>Admin Walk-ins</h4>
                <p>Independent walk-ins are not attached to member accounts.</p>
              </div>
              <span className="waitlist-badge">
                Confirmed {confirmedIndependentWalkins.length}
              </span>
            </div>

            <div className="admin-walkin-form">
              <div className="admin-walkin-drafts">
                {independentWalkinDrafts.map((name, index) => (
                  <div key={`${session.id}-walkin-draft-${index}`} className="admin-walkin-input-row">
                    <label>Walk-in Name</label>
                    <input
                      type="text"
                      placeholder="Walk-in name"
                      value={name}
                      onChange={(event) =>
                        updateWalkinDraft(session.id, index, event.target.value)
                      }
                    />
                    {independentWalkinDrafts.length > 1 && (
                      <button
                        className="small-reject-button"
                        type="button"
                        onClick={() => removeWalkinDraft(session.id, index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="admin-walkin-controls">
                <div>
                  <label>Status</label>
                  <select
                    value={independentWalkinStatus}
                    onChange={(event) =>
                      setWalkinStatusBySession((previousStatuses) => ({
                        ...previousStatuses,
                        [session.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="waiting">Waiting</option>
                  </select>
                </div>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => addWalkinDraft(session.id)}
                >
                  Add another walk-in
                </button>

                <button
                  className="action-button"
                  type="button"
                  onClick={() => submitIndependentWalkins(session.id)}
                >
                  Add Walk-in(s)
                </button>
              </div>
            </div>

            <div className="admin-walkin-list-grid">
              <div>
                <h4>Confirmed Independent Walk-ins</h4>
                {visibleIndependentWalkins.length === 0 ? (
                  <p className="empty-text">No confirmed independent walk-ins.</p>
                ) : (
                  visibleIndependentWalkins.map((walkin) => (
                    <div key={walkin.id} className="waitlist-row">
                      <div>
                        <strong>{walkin.name}</strong>
                        <small>{walkin.createdAt || "Independent walk-in"}</small>
                      </div>
                      <span className="waitlist-badge">
                        {walkin.status}
                      </span>
                      <div className="waitlist-actions">
                        {walkin.status === "confirmed" && (
                          <button
                            className="small-reject-button"
                            type="button"
                            onClick={() => handleCancelIndependentWalkin(walkin.id)}
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          className="small-reject-button"
                          type="button"
                          onClick={() => handleRemoveIndependentWalkin(walkin.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                <h4>Walk-in Waitlist</h4>
                {waitingIndependentWalkins.length === 0 ? (
                  <p className="empty-text">No independent walk-in waitlist.</p>
                ) : (
                  waitingIndependentWalkins.map((walkin) => (
                    <div key={walkin.id} className="waitlist-row">
                      <div>
                        <strong>{walkin.name}</strong>
                        <small>{walkin.createdAt || "Waiting request"}</small>
                      </div>
                      <span className="waitlist-badge">waiting</span>
                      <div className="waitlist-actions">
                        <button
                          className="small-approve-button"
                          type="button"
                          onClick={() => handlePromoteIndependentWalkin(walkin.id)}
                        >
                          Promote
                        </button>
                        <button
                          className="small-reject-button"
                          type="button"
                          onClick={() => handleRemoveIndependentWalkin(walkin.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {canAdminAddMember && (
          <div className="admin-add-member-section">
            <div className="admin-walkin-header">
              <div>
                <h4>Admin Add Member</h4>
                <p>Add an active member directly into this session.</p>
              </div>
            </div>

            <div className="admin-add-member-controls">
              <div>
                <label>Member</label>
                <select
                  value={selectedAdminMemberId}
                  onChange={(event) =>
                    setAdminMemberBySession((previousMembers) => ({
                      ...previousMembers,
                      [session.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Select member</option>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Status</label>
                <select
                  value={adminMemberAddMode}
                  onChange={(event) =>
                    setAdminMemberModeBySession((previousModes) => ({
                      ...previousModes,
                      [session.id]: event.target.value,
                    }))
                  }
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="waiting">Waitlist</option>
                </select>
              </div>

              <button
                className="action-button"
                type="button"
                disabled={activeMembers.length === 0}
                onClick={() => submitAdminMember(session.id)}
              >
                Add Member
              </button>
            </div>
          </div>
        )}

        <div className="session-booking-list">
          <div className="session-booking-header">
            <h4>Booked Members</h4>
            <div className="session-booking-summary">
              {bookingStatusOptions.map((option) => (
                <span key={option.value}>
                  {option.label}: {bookingStatusCounts[option.value] || 0}
                </span>
              ))}
            </div>
          </div>

          {confirmedBookings.length === 0 ? (
            <p className="empty-text">No booking yet.</p>
          ) : (
            <>
              <div className="session-booking-tools">
                <input
                  type="search"
                  placeholder="Search booked member..."
                  value={bookingSearch}
                  onChange={(event) =>
                    setBookingSearchBySession((previousSearches) => ({
                      ...previousSearches,
                      [session.id]: event.target.value,
                    }))
                  }
                />

                <div className="session-booking-quick-actions">
                  <button
                    className="secondary-button"
                    disabled={isCharged || !hasBookedBookings}
                    onClick={() =>
                      handleBulkUpdateSessionBookingStatus(
                        session.id,
                        "mark_booked_attended"
                      )
                    }
                  >
                    Mark All Booked as Attended
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isCharged || !hasNonCancelledBookings}
                    onClick={() =>
                      handleBulkUpdateSessionBookingStatus(
                        session.id,
                        "reset_non_cancelled_booked"
                      )
                    }
                  >
                    Reset All to Booked
                  </button>
                </div>
              </div>

              {visibleBookings.length === 0 ? (
                <p className="empty-text">No matched booking.</p>
              ) : (
                <div className="session-booking-scroll">
                  {visibleBookings.map((booking) => {
                    const member = members.find(
                      (member) =>
                        Number(member.id) === Number(booking.memberId)
                    );
                    const currentStatus = bookingStatusOptions.find(
                      (option) => option.value === booking.status
                    );

                    return (
                      <div key={booking.id} className="session-booking-row">
                        <div className="session-booking-member">
                          <span>{member ? member.name : "Unknown Member"}</span>
                          <small>
                            {booking.bookedAt
                              ? `Booked ${booking.bookedAt}`
                              : "Booking record"}
                          </small>
                          <small>
                            Walk-in: {Number(booking.walkInCount || 0)}
                            {booking.walkInNames?.length
                              ? ` · ${booking.walkInNames.join(", ")}`
                              : ""}
                          </small>
                          {Number(booking.lateCancelledWalkInCount || 0) > 0 && (
                            <small>
                              Late cancelled walk-in:{" "}
                              {booking.lateCancelledWalkInCount}
                              {booking.lateCancelledWalkInNames?.length
                                ? ` · ${booking.lateCancelledWalkInNames.join(", ")}`
                                : ""}
                            </small>
                          )}
                        </div>

                        <div className="session-booking-status">
                          <span className="booking-status-pill">
                            {currentStatus
                              ? currentStatus.label
                              : booking.status}
                          </span>
                          <select
                            className="session-status-select"
                            value={booking.status}
                            disabled={isCharged}
                            onChange={(event) =>
                              handleUpdateBookingStatus(
                                booking.id,
                                event.target.value
                              )
                            }
                          >
                            {bookingStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="walkin-admin-edit">
                          <label>Walk-in Count</label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={booking.walkInCount ?? 0}
                            disabled={isCharged}
                            onBlur={(event) =>
                              handleUpdateBookingWalkIns(
                                booking.id,
                                event.target.value,
                                (booking.walkInNames || []).join(", ")
                              )
                            }
                          />
                          <label>Walk-in Names</label>
                          <input
                            type="text"
                            placeholder="Alex, Jason"
                            defaultValue={(booking.walkInNames || []).join(", ")}
                            disabled={isCharged}
                            onBlur={(event) =>
                              handleUpdateBookingWalkIns(
                                booking.id,
                                booking.walkInCount || 0,
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="waitlist-section">
          <div>
            <h4>Member Waiting List</h4>
            {memberWaitlist.length === 0 ? (
              <p className="empty-text">No member waiting list.</p>
            ) : (
              memberWaitlist.map((booking) => {
                const member = members.find(
                  (member) => Number(member.id) === Number(booking.memberId)
                );

                return (
                  <div key={booking.id} className="waitlist-row">
                    <div>
                      <strong>{member?.name || "Unknown Member"}</strong>
                      <small>{booking.bookedAt || "Waiting request"}</small>
                    </div>
                    <span className="waitlist-badge">Member</span>
                    <div className="waitlist-actions">
                      <button
                        className="small-approve-button"
                        disabled={isCharged}
                        onClick={() => handlePromoteWaitlistBooking(booking.id)}
                      >
                        Promote
                      </button>
                      <button
                        className="small-reject-button"
                        disabled={isCharged}
                        onClick={() => handleRemoveWaitlistBooking(booking.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <h4>Walk-in Waiting List</h4>
            {walkInWaitlist.length === 0 ? (
              <p className="empty-text">No walk-in waiting list.</p>
            ) : (
              walkInWaitlist.map((booking) => {
                const member = members.find(
                  (member) => Number(member.id) === Number(booking.memberId)
                );

                return (
                  <div key={booking.id} className="waitlist-row">
                    <div>
                      <strong>{member?.name || "Unknown Member"}</strong>
                      <small>{booking.bookedAt || "Waiting request"}</small>
                      <small>
                        Walk-in: {Number(booking.walkInCount || 0)}
                        {booking.walkInNames?.length
                          ? ` · ${booking.walkInNames.join(", ")}`
                          : ""}
                      </small>
                    </div>
                    <span className="waitlist-badge">Walk-in</span>
                    <div className="waitlist-actions">
                      <button
                        className="small-approve-button"
                        disabled={isCharged}
                        onClick={() => handlePromoteWaitlistBooking(booking.id)}
                      >
                        Promote
                      </button>
                      <button
                        className="small-reject-button"
                        disabled={isCharged}
                        onClick={() => handleRemoveWaitlistBooking(booking.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="session-finalize-box">
          <h4>Finalize Charge</h4>

          <div className="session-charge-grid">
            <div>
              <label>Walk-in Limit</label>
              <input
                type="number"
                min="0"
                value={session.walkInLimit ?? 5}
                disabled={isCharged}
                onChange={(event) =>
                  handleUpdateSessionChargeField(
                    session.id,
                    "walkInLimit",
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label>Shuttlecock Used</label>
              <input
                type="number"
                min="0"
                value={session.shuttlecockUsed ?? ""}
                disabled={isCharged}
                onChange={(event) =>
                  handleUpdateSessionChargeField(
                    session.id,
                    "shuttlecockUsed",
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label>Shuttlecock Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={session.shuttlecockRate ?? ""}
                disabled={isCharged}
                onChange={(event) =>
                  handleUpdateSessionChargeField(
                    session.id,
                    "shuttlecockRate",
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label>Other Fee Total</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={session.otherFeeTotal ?? ""}
                disabled={isCharged}
                onChange={(event) =>
                  handleUpdateSessionChargeField(
                    session.id,
                    "otherFeeTotal",
                    event.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="session-charge-summary-grid">
            <div>
              <small>Court denominator incl. walk-ins</small>
              <strong>{chargeSummary.courtDenominator}</strong>
            </div>

            <div>
              <small>Shuttlecock denominator incl. walk-ins</small>
              <strong>{chargeSummary.shuttlecockDenominator}</strong>
            </div>

            <div>
              <small>Total confirmed walk-ins</small>
              <strong>{chargeSummary.totalConfirmedWalkInCount}</strong>
            </div>

            <div>
              <small>Shuttlecock total</small>
              <strong>{formatMoney(chargeSummary.shuttlecockFeeTotal)}</strong>
            </div>

            <div>
              <small>Court per player</small>
              <strong>{formatMoney(chargeSummary.courtFeePerPlayer)}</strong>
            </div>

            <div>
              <small>Attended member extra per player</small>
              <strong>
                {formatMoney(chargeSummary.attendedFeePerPlayer)}
              </strong>
            </div>

            <div>
              <small>Walk-ins fixed fee only</small>
              <strong>No wallet charge</strong>
            </div>

            <div>
              <small>Members to charge</small>
              <strong>{chargeSummary.chargeRows.length}</strong>
            </div>
          </div>

          {isCharged && session.chargedAt && (
            <p className="positive">Finalized {session.chargedAt}</p>
          )}

          <button
            className="action-button"
            disabled={isCharged || allBookings.length === 0}
            onClick={() => handleFinalizeSessionCharge(session.id)}
          >
            {isCharged ? "Session Charged" : "Finalize Session Charge"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel session-booking-panel">
      <div className="panel-header">
        <div>
          <h2>Session Booking Management</h2>
          <p>Create badminton sessions and manage booking status.</p>
        </div>
      </div>

      <div className="session-form-grid">
        <div>
          <label>Date</label>
          <input
            className="session-date-input"
            type="date"
            value={newSessionDate}
            onChange={(event) => setNewSessionDate(event.target.value)}
          />
        </div>

        <div>
          <label>Time</label>
          <input
            type="text"
            placeholder="Example: 7:00 PM - 9:00 PM"
            value={newSessionTime}
            onChange={(event) => setNewSessionTime(event.target.value)}
          />
        </div>

        <div>
          <label>Venue</label>
          <input
            type="text"
            placeholder="Example: Arena Sukan"
            value={newSessionVenue}
            onChange={(event) => setNewSessionVenue(event.target.value)}
          />
        </div>

        <div>
          <label>Court Count</label>
          <input
            type="number"
            placeholder="Example: 4"
            value={newSessionCourtCount}
            onChange={(event) => setNewSessionCourtCount(event.target.value)}
          />
        </div>

        <div>
          <label>Max Players</label>
          <input
            type="number"
            placeholder="Example: 24"
            value={newSessionMaxPlayers}
            onChange={(event) => setNewSessionMaxPlayers(event.target.value)}
          />
        </div>

        <div>
          <label>Walk-in Limit</label>
          <input
            type="number"
            min="0"
            placeholder="Example: 5"
            value={newSessionWalkInLimit}
            onChange={(event) => setNewSessionWalkInLimit(event.target.value)}
          />
        </div>

        <div>
          <label>Total Court Fee</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="Example: 160"
            value={newSessionCourtFeeTotal}
            onChange={(event) =>
              setNewSessionCourtFeeTotal(event.target.value)
            }
          />
        </div>

        <div>
          <label>Cancel Cutoff</label>
          <input
            type="time"
            value={newSessionCancelCutoff}
            onChange={(event) => setNewSessionCancelCutoff(event.target.value)}
          />
        </div>

        <div className="create-session-submit">
          <button
            className="action-button add-member-button"
            onClick={handleCreateSession}
          >
            Create Session
          </button>
        </div>
      </div>

      <hr />

      <div className="session-section-header">
        <div>
          <h2>Active Sessions</h2>
          <p>Open or uncharged sessions that still need admin attention.</p>
        </div>
      </div>

      {activeSessions.length === 0 ? (
        <p className="empty-text">No active session.</p>
      ) : (
        <div className="session-list">
          {activeSessions.map((session) => renderSessionCard(session))}
        </div>
      )}

      <div className="session-history-toggle">
        <button
          className="secondary-button"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "Hide Session History" : "Show Session History"}
        </button>
      </div>

      {showHistory && (
        <div className="session-history-section">
          <div className="session-section-header">
            <div>
              <h2>Session History</h2>
              <p>Charged sessions are kept here for reference.</p>
            </div>
          </div>

          {historySessions.length === 0 ? (
            <p className="empty-text">No charged session history yet.</p>
          ) : (
            <div className="session-list">
              {paginatedHistorySessions.map((session) =>
                renderSessionCard(session)
              )}
            </div>
          )}

          {historySessions.length > sessionHistoryPageSize && (
            <div className="pagination-controls">
              <button
                className="pagination-button"
                disabled={safeSessionHistoryPage === 1}
                onClick={() => setSessionHistoryPage(safeSessionHistoryPage - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {safeSessionHistoryPage} of {sessionHistoryTotalPages}
              </span>
              <button
                className="pagination-button"
                disabled={safeSessionHistoryPage === sessionHistoryTotalPages}
                onClick={() => setSessionHistoryPage(safeSessionHistoryPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminBookingManagement;
