import { useState } from "react";

function AdminBookingManagement({
  bookingStatusOptions,
  formatMoney,
  getActiveSessionBookings,
  getSessionBookings,
  getSessionChargeSummary,
  handleCloseSession,
  handleCreateSession,
  handleFinalizeSessionCharge,
  handleOpenSession,
  handleBulkUpdateSessionBookingStatus,
  handleUpdateBookingStatus,
  handleUpdateSessionChargeField,
  members,
  newSessionCancelCutoff,
  newSessionCourtCount,
  newSessionCourtFeeTotal,
  newSessionDate,
  newSessionMaxPlayers,
  newSessionTime,
  newSessionVenue,
  sessions,
  setNewSessionCancelCutoff,
  setNewSessionCourtCount,
  setNewSessionCourtFeeTotal,
  setNewSessionDate,
  setNewSessionMaxPlayers,
  setNewSessionTime,
  setNewSessionVenue,
  users = [],
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [bookingSearchBySession, setBookingSearchBySession] = useState({});
  const [sessionHistoryPage, setSessionHistoryPage] = useState(1);

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

  function renderSessionCard(session) {
    const activeBookings = getActiveSessionBookings(session.id);
    const allBookings = getSessionBookings(session.id);
    const chargeSummary = getSessionChargeSummary(session, allBookings);
    const isCharged = session.chargeStatus === "charged";
    const bookingSearch = bookingSearchBySession[session.id] || "";
    const normalizedBookingSearch = bookingSearch.trim().toLowerCase();
    const bookingStatusCounts = bookingStatusOptions.reduce((counts, option) => {
      counts[option.value] = allBookings.filter(
        (booking) => booking.status === option.value
      ).length;
      return counts;
    }, {});
    const visibleBookings = allBookings.filter((booking) => {
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
    const hasBookedBookings = allBookings.some(
      (booking) => booking.status === "booked"
    );
    const hasNonCancelledBookings = allBookings.some(
      (booking) => booking.status !== "cancelled"
    );

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
              {activeBookings.length}/{session.maxPlayers}
            </strong>
          </p>
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

          {allBookings.length === 0 ? (
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
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="session-finalize-box">
          <h4>Finalize Charge</h4>

          <div className="session-charge-grid">
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
              <small>Court charged players</small>
              <strong>{chargeSummary.courtBookings.length}</strong>
            </div>

            <div>
              <small>Attended players</small>
              <strong>{chargeSummary.attendedBookings.length}</strong>
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
              <small>Attended extra per player</small>
              <strong>
                {formatMoney(chargeSummary.attendedFeePerPlayer)}
              </strong>
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
          <label>Total Court Fee</label>
          <input
            type="number"
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
      </div>

      <button
        className="action-button add-member-button"
        onClick={handleCreateSession}
      >
        Create Session
      </button>

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
