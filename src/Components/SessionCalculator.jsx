import { useState } from "react";

function SessionCalculator({ members, setMembers, setTransactions, formatMoney }) {
    const [sessionDate, setSessionDate] = useState("");
    const [description, setDescription] = useState("Session Expense");
    const [courtCost, setCourtCost] = useState(120);
    const [shuttleUsed, setShuttleUsed] = useState(0);
    const [shuttleRate, setShuttleRate] = useState(11);
    const [walkinAttendance, setWalkinAttendance] = useState(0);
    const [walkinFee, setWalkinFee] = useState(16);
    const [managementFeePerMember, setManagementFeePerMember] = useState(1);
    const [selectedSessionMembers, setSelectedSessionMembers] = useState([]);

    const activeMembers = members.filter((member) => member.status !== "inactive");

    const memberAttendance = selectedSessionMembers.length;
    const totalWalkinAttendance = Number(walkinAttendance);
    const totalAttendance = memberAttendance + totalWalkinAttendance;

    const totalCourtCost = Number(courtCost);
    const totalShuttleCost = Number(shuttleUsed) * Number(shuttleRate);
    const totalManagementFee = memberAttendance * Number(managementFeePerMember);

    const sharedCostBeforeRounding =
        totalAttendance > 0 ? (totalCourtCost + totalShuttleCost) / totalAttendance : 0;

    const roundedSharedCost = Math.ceil(sharedCostBeforeRounding * 10) / 10;

    const chargePerMember =
        totalAttendance > 0
            ? roundedSharedCost + totalManagementFee / totalAttendance
            : 0;

    const bytCollection =
        memberAttendance * chargePerMember + totalWalkinAttendance * Number(walkinFee);

    const bytCost = totalCourtCost + totalShuttleCost;

    const walkinRevenue = totalWalkinAttendance * Number(walkinFee);

    const bytRevenue = bytCollection - bytCost;

    function handleToggleSessionMember(memberId) {
        if (selectedSessionMembers.includes(memberId)) {
            setSelectedSessionMembers(
                selectedSessionMembers.filter((id) => id !== memberId)
            );
        } else {
            setSelectedSessionMembers([...selectedSessionMembers, memberId]);
        }
    }

    function handleSelectAllSessionMembers() {
        setSelectedSessionMembers(activeMembers.map((member) => member.id));
    }

    function handleClearSessionMembers() {
        setSelectedSessionMembers([]);
    }

    function handleChargeSessionMembers() {
        if (memberAttendance === 0) {
            alert("Please select at least one member");
            return;
        }

        if (totalAttendance <= 0) {
            alert("Total attendance must be more than 0");
            return;
        }

        if (chargePerMember <= 0) {
            alert("Charge per member must be more than 0");
            return;
        }

        const finalDate =
            sessionDate.trim() === ""
                ? new Date().toLocaleDateString()
                : sessionDate;

        const finalDescription =
            description.trim() === "" ? "Session Expense" : description;

        setMembers((previousMembers) =>
            previousMembers.map((member) => {
                if (selectedSessionMembers.includes(member.id)) {
                    return {
                        ...member,
                        balance: member.balance - chargePerMember,
                    };
                }

                return member;
            })
        );

        const newTransactions = selectedSessionMembers.map((memberId) => ({
            id: Date.now() + memberId,
            memberId: memberId,
            date: finalDate,
            description: finalDescription,
            amount: -chargePerMember,
        }));

        setTransactions((previousTransactions) => [
            ...newTransactions,
            ...previousTransactions,
        ]);

        alert(
            `Session charged successfully. Each selected member deducted ${formatMoney(
                chargePerMember
            )}`
        );

        setSelectedSessionMembers([]);
        setShuttleUsed(0);
        setWalkinAttendance(0);
        setDescription("Session Expense");
    }

    return (
        <div className="panel session-calculator-panel">
            <div className="panel-header">
                <div>
                    <h2>Session Calculator</h2>
                    <p>Calculate court, shuttle, walk-in and member charges.</p>
                </div>
            </div>

            <div className="calculator-grid">
                <div>
                    <label>Session Date</label>
                    <input
                        type="date"
                        value={sessionDate}
                        onChange={(event) => setSessionDate(event.target.value)}
                    />
                </div>

                <div>
                    <label>Description</label>
                    <input
                        type="text"
                        placeholder="Example: Court Rental 26 May"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </div>

                <div>
                    <label>Court Cost</label>
                    <input
                        type="number"
                        value={courtCost}
                        onChange={(event) => setCourtCost(event.target.value)}
                    />
                </div>

                <div>
                    <label>Shuttle Used</label>
                    <input
                        type="number"
                        value={shuttleUsed}
                        onChange={(event) => setShuttleUsed(event.target.value)}
                    />
                </div>

                <div>
                    <label>Shuttle Rate Per Pcs</label>
                    <input
                        type="number"
                        value={shuttleRate}
                        onChange={(event) => setShuttleRate(event.target.value)}
                    />
                </div>

                <div>
                    <label>Walk-in Attendance</label>
                    <input
                        type="number"
                        value={walkinAttendance}
                        onChange={(event) => setWalkinAttendance(event.target.value)}
                    />
                </div>

                <div>
                    <label>Walk-in Fee</label>
                    <input
                        type="number"
                        value={walkinFee}
                        onChange={(event) => setWalkinFee(event.target.value)}
                    />
                </div>

                <div>
                    <label>Mgmt Fee</label>
                    <input
                        type="number"
                        value={managementFeePerMember}
                        onChange={(event) =>
                            setManagementFeePerMember(event.target.value)
                        }
                    />
                </div>
            </div>

            <div className="calculator-summary-grid">
                <div className="summary-card">
                    <p>Member Attendance</p>
                    <h3>{memberAttendance}</h3>
                </div>

                <div className="summary-card">
                    <p>Walk-in Attendance</p>
                    <h3>{totalWalkinAttendance}</h3>
                </div>

                <div className="summary-card">
                    <p>Total Attendance</p>
                    <h3>{totalAttendance}</h3>
                </div>

                <div className="summary-card">
                    <p>Shuttle Total Cost</p>
                    <h3>{formatMoney(totalShuttleCost)}</h3>
                </div>

                <div className="summary-card">
                    <p>BYT Cost</p>
                    <h3>{formatMoney(bytCost)}</h3>
                </div>

                <div className="summary-card">
                    <p>Walk-in Revenue</p>
                    <h3>{formatMoney(walkinRevenue)}</h3>
                </div>

                <div className="summary-card highlight">
                    <p>Charge Per Member</p>
                    <h3>{formatMoney(chargePerMember)}</h3>
                </div>

                <div className={bytRevenue >= 0 ? "summary-card profit" : "summary-card loss"}>
                    <p>BYT Revenue / Nett</p>
                    <h3>{formatMoney(bytRevenue)}</h3>
                </div>
            </div>

            <div className="panel-header member-select-header">
                <div>
                    <h2>Select Members Attended</h2>
                    <p>Selected members will be charged after submit.</p>
                </div>

                <div className="button-row small-button-row">
                    <button className="secondary-button" onClick={handleSelectAllSessionMembers}>
                        Select All
                    </button>

                    <button className="secondary-button" onClick={handleClearSessionMembers}>
                        Clear
                    </button>
                </div>
            </div>

            <div className="session-member-scroll">
                {activeMembers.map((member) => (
                    <label key={member.id} className="session-member-row">
                        <input
                            type="checkbox"
                            checked={selectedSessionMembers.includes(member.id)}
                            onChange={() => handleToggleSessionMember(member.id)}
                        />

                        <span>{member.name}</span>

                        <strong
                            className={member.balance < 0 ? "negative-text" : "positive-text"}
                        >
                            {formatMoney(member.balance)}
                        </strong>
                    </label>
                ))}
            </div>

            <button className="action-button" onClick={handleChargeSessionMembers}>
                Charge Selected Members
            </button>
        </div>
    );
}

export default SessionCalculator;