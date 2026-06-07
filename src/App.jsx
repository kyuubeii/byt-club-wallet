import { useEffect, useState } from "react";
import "./App.css";
import LoginPage from "./Components/LoginPage.jsx";
import MemberTable from "./Components/MemberTable.jsx";
import AdminStats from "./Components/AdminStats.jsx";
import TopBar from "./Components/TopBar.jsx";
import MemberPortal from "./Components/MemberPortal.jsx";
import SessionCalculator from "./Components/SessionCalculator.jsx";
import AdminBookingManagement from "./Components/AdminBookingManagement.jsx";
import EditMemberPanel from "./Components/EditMemberPanel.jsx";
import { initialMembers } from "./data/initialMembers.js";
import { initialUsers } from "./data/initialUsers.js";

const MINIMUM_BOOKING_BALANCE = 15;
const USE_SUPABASE_DATA = true;
const APP_VERSION = "1.0.0";
const APP_ENVIRONMENT = import.meta.env.MODE;
const APP_DATA_MODE = USE_SUPABASE_DATA ? "Supabase Online" : "Local Cache";

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

function getErrorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || String(error);
}

function getFriendlyErrorMessage(error) {
  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("failed to fetch")) {
    return "Cannot connect to cloud server. Please check your internet connection and try again.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Permission issue. Please contact admin.";
  }

  if (
    normalizedMessage.includes("duplicate key") ||
    normalizedMessage.includes("already exists")
  ) {
    return "This record already exists. Please check the details.";
  }

  if (normalizedMessage.includes("timeout")) {
    return "Request timed out. Please check your internet connection and try again.";
  }

  if (
    normalizedMessage.includes("storage") ||
    normalizedMessage.includes("bucket")
  ) {
    return "File upload failed. Please try again or contact admin.";
  }

  return message;
}

function getFriendlyCloudSyncMessage(error) {
  return `Saved locally, but cloud sync failed. ${getFriendlyErrorMessage(error)}`;
}

function normalizeWhatsappNumber(value) {
  const trimmedValue = String(value || "").trim();

  if (trimmedValue === "") {
    return "";
  }

  if (!/^[0-9+\s-]+$/.test(trimmedValue)) {
    return null;
  }

  let normalizedValue = trimmedValue.replace(/[\s-]/g, "");

  if (normalizedValue.startsWith("+")) {
    normalizedValue = normalizedValue.slice(1);
  }

  if (normalizedValue.startsWith("0")) {
    normalizedValue = `60${normalizedValue.slice(1)}`;
  }

  if (!/^\d+$/.test(normalizedValue) || normalizedValue.length < 8) {
    return null;
  }

  return normalizedValue;
}

const initialTransactions = [
  {
    id: 1,
    memberId: 3,
    date: "20 Apr 2026",
    description: "Weekly Club Expense",
    amount: -14.6,
  },
  {
    id: 2,
    memberId: 3,
    date: "13 Apr 2026",
    description: "Weekly Club Expense",
    amount: -12.8,
  },
  {
    id: 3,
    memberId: 3,
    date: "05 Apr 2026",
    description: "Reload",
    amount: 50,
  },
];
const initialSessions = [
  {
    id: 1,
    date: "2026-06-08",
    time: "7:00 PM - 9:00 PM",
    venue: "Arena Sukan",
    courtCount: 4,
    maxPlayers: 24,
    courtFeeTotal: 160,
    cancelCutoff: "12:00",
    status: "open",
    chargeStatus: "not_charged",
    shuttlecockUsed: 0,
    shuttlecockRate: 11,
    otherFeeTotal: 0,
  },
];

const initialSessionBookings = [];

const bookingStatusOptions = [
  { value: "booked", label: "Booked" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No Show" },
  { value: "late_cancel", label: "Late Cancel" },
  { value: "cancelled", label: "Cancelled" },
];

const courtChargeStatuses = ["booked", "attended", "no_show", "late_cancel"];

const STORAGE_KEYS = {
  users: "byt_users",
  members: "byt_members",
  reloadRequests: "byt_reloadRequests",
  transactions: "byt_transactions",
  sessions: "byt_sessions",
  sessionBookings: "byt_sessionBookings",
};

function loadFromStorage(key, fallbackValue) {
  if (typeof localStorage === "undefined") {
    return fallbackValue;
  }

  try {
    const storedValue = localStorage.getItem(key);

    if (storedValue === null) {
      return fallbackValue;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage`, error);
    return fallbackValue;
  }
}

function saveToStorage(key, value) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage`, error);
  }
}

function createInitialUsers() {
  const generatedMemberUsers = initialMembers.map((member) => ({
    id: `member-${member.id}`,
    memberId: member.id,
    name: member.name,
    email: `member${member.id}`,
    password: "123456",
    role: "member",
  }));

  const importedUsers = [...initialUsers];

  const importedMemberIds = importedUsers
    .filter((user) => user.role === "member")
    .map((user) => Number(user.memberId));

  const missingGeneratedUsers = generatedMemberUsers.filter(
    (user) => !importedMemberIds.includes(Number(user.memberId))
  );

  return [...importedUsers, ...missingGeneratedUsers];
}

function formatMoney(amount) {
  if (amount < 0) {
    return `-RM${Math.abs(amount).toFixed(2)}`;
  }

  return `RM${amount.toFixed(2)}`;
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function convertSupabaseMembers(supabaseMembers) {
  return supabaseMembers.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email || "",
    balance: Number(member.balance || 0),
    status: member.status || "active",
    memberType: member.member_type || null,
    whatsapp: member.whatsapp || "",
  }));
}

function convertSupabaseUsers(supabaseUsers) {
  return supabaseUsers.map((user) => ({
    id: user.id,
    memberId: user.member_id,
    name: user.name || "",
    email: user.email || "",
    password: user.password || "",
    role: user.role || "member",
  }));
}

function convertSupabaseSessions(supabaseSessions) {
  return supabaseSessions.map((session) => ({
    id: session.id,
    date: session.date,
    time: session.time || "",
    venue: session.venue || "",
    courtCount: Number(session.court_count || 0),
    maxPlayers: Number(session.max_players || 0),
    courtFeeTotal: Number(session.court_fee_total || 0),
    cancelCutoff: session.cancel_cutoff || "",
    status: session.status || "open",
    chargeStatus: session.charge_status || "not_charged",
    shuttlecockUsed: Number(session.shuttlecock_used || 0),
    shuttlecockRate: Number(session.shuttlecock_rate || 0),
    otherFeeTotal: Number(session.other_fee_total || 0),
    chargedAt: session.charged_at || null,
    finalizedCourtChargePerPlayer:
      session.finalized_court_charge_per_player ?? null,
    finalizedAttendedChargePerPlayer:
      session.finalized_attended_charge_per_player ?? null,
  }));
}

function convertSupabaseSessionBookings(supabaseBookings) {
  return supabaseBookings.map((booking) => ({
    id: booking.id,
    sessionId: booking.session_id,
    memberId: booking.member_id,
    status: booking.status || "booked",
    bookedAt: booking.booked_at || "",
    cancelledAt: booking.cancelled_at || null,
    statusUpdatedAt: booking.status_updated_at || null,
  }));
}

function convertSupabaseTransactions(supabaseTransactions) {
  return supabaseTransactions.map((transaction) => ({
    id: transaction.id,
    memberId: transaction.member_id,
    date: transaction.date,
    description: transaction.description || "",
    amount: Number(transaction.amount || 0),
    type: transaction.type || null,
  }));
}

function convertSupabaseReloadRequests(supabaseReloadRequests) {
  return supabaseReloadRequests.map((request) => ({
    id: request.id,
    memberId: request.member_id,
    memberName: request.member_name || "",
    amount: Number(request.amount || 0),
    status: request.status || "Pending",
    date: request.date,
    screenshotName: request.screenshot_name || "",
    screenshotUrl: request.screenshot_url || "",
  }));
}

function App() {
  const [users, setUsers] = useState(() =>
    loadFromStorage(STORAGE_KEYS.users, createInitialUsers())
  );
  const [members, setMembers] = useState(() =>
    loadFromStorage(STORAGE_KEYS.members, initialMembers)
  );

  const [page, setPage] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingSupabaseData, setIsLoadingSupabaseData] = useState(false);
  const [supabaseLoadError, setSupabaseLoadError] = useState("");
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLoadingActivityLogs, setIsLoadingActivityLogs] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [registerName, setRegisterName] = useState("");

  const [selectedMemberId, setSelectedMemberId] = useState(3);
  const [manualBalance, setManualBalance] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [selectedExpenseMembers, setSelectedExpenseMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [adminPendingReloadPage, setAdminPendingReloadPage] = useState(1);
  const [adminTransactionPage, setAdminTransactionPage] = useState(1);
  const [pendingMemberApprovalPage, setPendingMemberApprovalPage] = useState(1);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  const [isDeveloperToolsUnlocked, setIsDeveloperToolsUnlocked] = useState(false);
  const [developerToolsUnlockText, setDeveloperToolsUnlockText] = useState("");
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [showBalanceToolsSection, setShowBalanceToolsSection] = useState(false);
  const [showBookingSection, setShowBookingSection] = useState(true);
  const [showTransactionsSection, setShowTransactionsSection] = useState(false);
  const [showActivitySection, setShowActivitySection] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberBalance, setNewMemberBalance] = useState("");
  const [editingMemberId, setEditingMemberId] = useState("");
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberEmail, setEditMemberEmail] = useState("");
  const [editMemberBalance, setEditMemberBalance] = useState("");
  const [editMemberStatus, setEditMemberStatus] = useState("active");
  const [editMemberWhatsapp, setEditMemberWhatsapp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [memberOldPassword, setMemberOldPassword] = useState("");
  const [memberNewPassword, setMemberNewPassword] = useState("");
  const [memberConfirmPassword, setMemberConfirmPassword] = useState("");
  const [showMemberPasswordPanel, setShowMemberPasswordPanel] = useState(false);
  const [memberNewLoginId, setMemberNewLoginId] = useState("");
  const [memberLoginIdPassword, setMemberLoginIdPassword] = useState("");
  const [showMemberLoginIdPanel, setShowMemberLoginIdPanel] = useState(false);
  const [memberWhatsappInput, setMemberWhatsappInput] = useState("");
  const [showWhatsappPrompt, setShowWhatsappPrompt] = useState(false);

  const [showTopUpBox, setShowTopUpBox] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [isSubmittingReloadRequest, setIsSubmittingReloadRequest] = useState(false);
  const [reloadRequests, setReloadRequests] = useState(() =>
    loadFromStorage(STORAGE_KEYS.reloadRequests, [])
  );
  const [transactions, setTransactions] = useState(() =>
    loadFromStorage(STORAGE_KEYS.transactions, initialTransactions)
  );
  const [sessions, setSessions] = useState(() =>
    loadFromStorage(STORAGE_KEYS.sessions, initialSessions)
  );
  const [sessionBookings, setSessionBookings] = useState(() =>
    loadFromStorage(STORAGE_KEYS.sessionBookings, initialSessionBookings)
  );

  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionTime, setNewSessionTime] = useState("");
  const [newSessionVenue, setNewSessionVenue] = useState("");
  const [newSessionCourtCount, setNewSessionCourtCount] = useState("");
  const [newSessionMaxPlayers, setNewSessionMaxPlayers] = useState("");
  const [newSessionCourtFeeTotal, setNewSessionCourtFeeTotal] = useState("");
  const [newSessionCancelCutoff, setNewSessionCancelCutoff] = useState("12:00");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.users, users);
  }, [users]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.members, members);
  }, [members]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.reloadRequests, reloadRequests);
  }, [reloadRequests]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.transactions, transactions);
  }, [transactions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.sessions, sessions);
  }, [sessions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.sessionBookings, sessionBookings);
  }, [sessionBookings]);

  useEffect(() => {
    if (USE_SUPABASE_DATA) {
      loadAllDataFromSupabase();
    }
  }, []);

  async function loadAllDataFromSupabase() {
    setIsLoadingSupabaseData(true);
    setSupabaseLoadError("");

    try {
      const {
        fetchMembersFromSupabase,
        fetchUsersFromSupabase,
        fetchSessionsFromSupabase,
        fetchSessionBookingsFromSupabase,
        fetchTransactionsFromSupabase,
        fetchReloadRequestsFromSupabase,
      } = await import("./services/supabaseServices.js");

      const [
        supabaseMembers,
        supabaseUsers,
        supabaseSessions,
        supabaseBookings,
        supabaseTransactions,
        supabaseReloadRequests,
      ] = await Promise.all([
        fetchMembersFromSupabase(),
        fetchUsersFromSupabase(),
        fetchSessionsFromSupabase(),
        fetchSessionBookingsFromSupabase(),
        fetchTransactionsFromSupabase(),
        fetchReloadRequestsFromSupabase(),
      ]);

      setMembers(convertSupabaseMembers(supabaseMembers));
      setUsers(convertSupabaseUsers(supabaseUsers));
      setSessions(convertSupabaseSessions(supabaseSessions));
      setSessionBookings(convertSupabaseSessionBookings(supabaseBookings));
      setTransactions(convertSupabaseTransactions(supabaseTransactions));
      setReloadRequests(convertSupabaseReloadRequests(supabaseReloadRequests));
      handleLoadRecentActivityLogs(false);
    } catch (error) {
      console.error("Supabase startup data load failed:", error);
      setSupabaseLoadError(getFriendlyErrorMessage(error));
    } finally {
      setIsLoadingSupabaseData(false);
    }
  }

  async function handleLoadRecentActivityLogs(showAlert = true) {
    setIsLoadingActivityLogs(true);

    try {
      const { fetchRecentActivityLogs } = await import(
        "./services/supabaseServices.js"
      );
      const logs = await fetchRecentActivityLogs(20);
      setActivityLogs(logs);
    } catch (error) {
      console.error("Failed to load activity logs:", error);
      if (showAlert) {
        alert(`Failed to load activity logs: ${getFriendlyErrorMessage(error)}`);
      }
    } finally {
      setIsLoadingActivityLogs(false);
    }
  }

  function renderSupabaseLoadNotice() {
    if (isLoadingSupabaseData) {
      return (
        <div className="supabase-load-notice">
          Loading Supabase data...
        </div>
      );
    }

    if (supabaseLoadError) {
      return (
        <div className="supabase-load-notice warning">
          Supabase data load failed. Using local cached data.
        </div>
      );
    }

    return null;
  }

  // Login and registration
  function handleLogin() {
    setAuthNotice("");

    const loginId = email.trim().toLowerCase();
    const loginPassword = password.trim();

    const foundUser = users.find(
      (user) =>
        String(user.email || "").trim().toLowerCase() === loginId &&
        String(user.password || "").trim() === loginPassword
    );

    if (!foundUser) {
      alert("Invalid login ID or password");
      return;
    }

    if (foundUser.role === "admin") {
      setCurrentUser(foundUser);
      setPage("admin");
      return;
    }

    if (foundUser.role === "member") {
      const memberData = members.find(
        (member) => Number(member.id) === Number(foundUser.memberId)
      );

      if (!memberData) {
        alert("Member profile not found");
        return;
      }

      if (memberData.status === "pending") {
        alert("Your account is pending approval. Please contact admin.");
        return;
      }

      if (memberData.status === "inactive") {
        alert("This member account is inactive. Please contact admin.");
        return;
      }

      setCurrentUser(foundUser);
      setMemberWhatsappInput("");
      setShowWhatsappPrompt(!String(memberData.whatsapp || "").trim());
      setPage("member");
      return;
    }
  }
  async function handleRegister() {
    if (registerName.trim() === "") {
      alert("Please enter your full name");
      return;
    }

    if (registerEmail.trim() === "") {
      alert("Please enter your email");
      return;
    }

    if (registerPassword.trim() === "") {
      alert("Please enter password");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      alert("Password and confirm password do not match");
      return;
    }

    const emailExistsInMembers = members.some(
      (member) =>
        (member.email || "").toLowerCase() === registerEmail.toLowerCase()
    );

    const emailExistsInUsers = users.some(
      (user) => user.email.toLowerCase() === registerEmail.toLowerCase()
    );

    if (emailExistsInMembers || emailExistsInUsers) {
      alert("This email is already registered");
      return;
    }

    const newId = Date.now();

    const newMember = {
      id: newId,
      name: registerName,
      email: registerEmail,
      balance: 0,
      status: "pending",
      memberType: "new",
      whatsapp: "",
    };

    const newUser = {
      id: newId,
      memberId: newId,
      name: registerName,
      email: registerEmail,
      password: registerPassword,
      role: "member",
    };

    setMembers((previousMembers) => [...previousMembers, newMember]);
    setUsers((previousUsers) => [...previousUsers, newUser]);

    let registrationMessage =
      "Registration submitted. Please wait for admin approval.";

    try {
      await syncMemberToSupabase(newMember);
      await syncUserToSupabase(newUser);
    } catch (error) {
      console.error("Registration cloud sync failed:", error);
      registrationMessage =
        "Registration saved locally, but cloud sync failed. Please contact admin if your account does not appear.";
    }

    alert(registrationMessage);
    setAuthNotice(registrationMessage);
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterConfirmPassword("");
    setPage("login");
  }

  function handleLogout() {
    setCurrentUser(null);
    setEmail("");
    setPassword("");
    setPage("login");
    setShowTopUpBox(false);
    setMemberOldPassword("");
    setMemberNewPassword("");
    setMemberConfirmPassword("");
    setShowMemberPasswordPanel(false);
    setMemberNewLoginId("");
    setMemberLoginIdPassword("");
    setShowMemberLoginIdPanel(false);
    setMemberWhatsappInput("");
    setShowWhatsappPrompt(false);
  }

  async function syncMemberToSupabase(member) {
    const { upsertMemberToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertMemberToSupabase(member);
  }

  async function syncMemberStatusToSupabase(memberId, status) {
    const { updateMemberStatusInSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await updateMemberStatusInSupabase(memberId, status);
  }

  async function syncUserToSupabase(user) {
    const { upsertUserToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertUserToSupabase(user);
  }

  async function syncUserByMemberIdToSupabase(memberId, updates) {
    const { updateUserByMemberIdInSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await updateUserByMemberIdInSupabase(memberId, updates);
  }

  async function syncSessionToSupabase(session) {
    const { upsertSessionToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertSessionToSupabase(session);
  }

  async function syncSessionBookingToSupabase(booking) {
    const { upsertSessionBookingToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertSessionBookingToSupabase(booking);
  }

  async function syncSessionUpdateToSupabase(sessionId, updates) {
    const { updateSessionInSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await updateSessionInSupabase(sessionId, updates);
  }

  async function syncSessionBookingUpdateToSupabase(bookingId, updates) {
    const { updateSessionBookingInSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await updateSessionBookingInSupabase(bookingId, updates);
  }

  async function syncReloadRequestToSupabase(request) {
    const { upsertReloadRequestToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertReloadRequestToSupabase(request);
  }

  async function uploadReloadScreenshot(file, memberId) {
    const { uploadReloadScreenshotToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    return uploadReloadScreenshotToSupabase(file, memberId);
  }

  async function syncReloadRequestUpdateToSupabase(requestId, updates) {
    const { updateReloadRequestInSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await updateReloadRequestInSupabase(requestId, updates);
  }

  async function syncTransactionToSupabase(transaction) {
    const { upsertTransactionToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertTransactionToSupabase(transaction);
  }

  async function syncTransactionsToSupabase(transactions) {
    const { upsertTransactionsToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertTransactionsToSupabase(transactions);
  }

  async function syncMemberBalanceToSupabase(memberId, balance) {
    const { updateMemberBalanceInSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await updateMemberBalanceInSupabase(memberId, balance);
  }

  async function logActivity(log) {
    try {
      const { createActivityLog } = await import(
        "./services/supabaseServices.js"
      );

      await createActivityLog({
        actorRole: currentUser?.role || log.actorRole || "",
        actorName: currentUser?.name || log.actorName || "",
        actorId:
          currentUser?.id === undefined || currentUser?.id === null
            ? log.actorId || ""
            : String(currentUser.id),
        ...log,
      });
    } catch (error) {
      console.error("Failed to create activity log:", error);
    }
  }

  function alertSupabaseMemberSyncFailed(error) {
    console.error("Supabase member sync failed:", error);
    alert(getFriendlyCloudSyncMessage(error));
  }

  function alertSupabaseUserSyncFailed(error) {
    console.error("Supabase user sync failed:", error);
    alert(getFriendlyCloudSyncMessage(error));
  }

  function alertSupabaseSessionSyncFailed(error) {
    console.error("Supabase session sync failed:", error);
    alert(getFriendlyCloudSyncMessage(error));
  }

  function alertSupabaseBookingSyncFailed(error) {
    console.error("Supabase booking sync failed:", error);
    alert(getFriendlyCloudSyncMessage(error));
  }

  function alertSupabaseFinanceSyncFailed(error) {
    console.error("Supabase finance sync failed:", error);
    alert(getFriendlyCloudSyncMessage(error));
  }

  // Member management
  async function handleManualBalanceUpdate() {
    const newBalance = Number(manualBalance);

    if (manualBalance === "") {
      alert("Please enter a balance amount");
      return;
    }

    const currentMember = members.find(
      (member) => Number(member.id) === Number(selectedMemberId)
    );

    if (!currentMember) {
      alert("Member not found");
      return;
    }

    const updatedMember = {
      ...currentMember,
      balance: newBalance,
    };

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(selectedMemberId)) {
          return updatedMember;
        }

        return member;
      })
    );

    setManualBalance("");
    try {
      await syncMemberToSupabase(updatedMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    alert("Balance updated successfully");
  }

  async function handleAddMember() {
    if (newMemberName.trim() === "") {
      alert("Please enter member name");
      return;
    }

    if (newMemberEmail.trim() === "") {
      alert("Please enter member email");
      return;
    }

    const emailExistsInMembers = members.some(
      (member) =>
        (member.email || "").toLowerCase() === newMemberEmail.toLowerCase()
    );

    const emailExistsInUsers = users.some(
      (user) => user.email.toLowerCase() === newMemberEmail.toLowerCase()
    );

    if (emailExistsInMembers || emailExistsInUsers) {
      alert("This email already exists");
      return;
    }

    const startingBalance =
      newMemberBalance === "" ? 0 : Number(newMemberBalance);

    const newId = Date.now();

    const newMember = {
      id: newId,
      name: newMemberName,
      email: newMemberEmail,
      balance: startingBalance,
      status: "active",
      whatsapp: "",
    };

    const newUser = {
      id: newId,
      memberId: newId,
      name: newMemberName,
      email: newMemberEmail,
      password: "123456",
      role: "member",
    };

    setMembers((previousMembers) => [...previousMembers, newMember]);
    setUsers((previousUsers) => [...previousUsers, newUser]);

    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberBalance("");

    try {
      await syncMemberToSupabase(newMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    try {
      await syncUserToSupabase(newUser);
    } catch (error) {
      alertSupabaseUserSyncFailed(error);
      return;
    }

    alert("New member added successfully. Default password is 123456.");
  }

  function handleStartEditMember(memberId) {
    const member = members.find(
      (member) => Number(member.id) === Number(memberId)
    );

    if (!member) {
      alert("Member not found");
      return;
    }

    const user = users.find((user) => Number(user.memberId) === Number(member.id));

    setEditingMemberId(member.id);
    setEditMemberName(member.name);
    setEditMemberEmail(user?.email || member.email || "");
    setEditMemberBalance(member.balance);
    setEditMemberStatus(member.status || "active");
    setEditMemberWhatsapp(member.whatsapp || "");
    setNewPassword("");
  }

  function handleCancelEditMember() {
    setEditingMemberId("");
    setEditMemberName("");
    setEditMemberEmail("");
    setEditMemberBalance("");
    setEditMemberStatus("active");
    setEditMemberWhatsapp("");
    setNewPassword("");
  }

  async function handleUpdateMemberInfo() {
    if (editingMemberId === "") {
      alert("Please select a member to edit");
      return;
    }

    if (editMemberName.trim() === "") {
      alert("Please enter member name");
      return;
    }

    if (editMemberEmail.trim() === "") {
      alert("Please enter member email");
      return;
    }

    if (editMemberBalance === "") {
      alert("Please enter member balance");
      return;
    }

    const updatedBalance = Number(editMemberBalance);

    if (Number.isNaN(updatedBalance)) {
      alert("Please enter a valid balance");
      return;
    }

    const currentMember = members.find(
      (member) => Number(member.id) === Number(editingMemberId)
    );

    if (!currentMember) {
      alert("Member not found");
      return;
    }

    const normalizedWhatsapp = normalizeWhatsappNumber(editMemberWhatsapp);

    if (normalizedWhatsapp === null) {
      alert("Please enter a valid WhatsApp number");
      return;
    }

    const updatedMember = {
      ...currentMember,
      name: editMemberName,
      email: editMemberEmail,
      balance: updatedBalance,
      status: editMemberStatus,
      whatsapp: normalizedWhatsapp,
    };

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(editingMemberId)) {
          return updatedMember;
        }

        return member;
      })
    );

    setUsers((previousUsers) =>
      previousUsers.map((user) => {
        if (Number(user.memberId) === Number(editingMemberId)) {
          return {
            ...user,
            name: editMemberName,
            email: editMemberEmail,
          };
        }

        return user;
      })
    );

    try {
      await syncMemberToSupabase(updatedMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    try {
      await syncUserByMemberIdToSupabase(editingMemberId, {
        name: editMemberName,
        email: editMemberEmail,
      });
    } catch (error) {
      alertSupabaseUserSyncFailed(error);
      return;
    }

    alert("Member info updated successfully");
  }

  async function handleDeactivateMember() {
    if (editingMemberId === "") {
      alert("Please select a member to edit");
      return;
    }

    const currentMember = members.find(
      (member) => Number(member.id) === Number(editingMemberId)
    );

    if (!currentMember) {
      alert("Member not found");
      return;
    }

    const confirmDeactivate = confirm(
      "Are you sure you want to deactivate this member?"
    );

    if (!confirmDeactivate) {
      return;
    }

    const updatedMember = {
      ...currentMember,
      status: "inactive",
    };

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(editingMemberId)) {
          return updatedMember;
        }

        return member;
      })
    );

    setEditMemberStatus("inactive");
    try {
      await syncMemberToSupabase(updatedMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    alert("Member deactivated");
  }
  async function handleReactivateMember() {
    if (editingMemberId === "") {
      alert("Please select a member to edit");
      return;
    }

    const currentMember = members.find(
      (member) => Number(member.id) === Number(editingMemberId)
    );

    if (!currentMember) {
      alert("Member not found");
      return;
    }

    const confirmReactivate = confirm(
      "Are you sure you want to reactivate this member?"
    );

    if (!confirmReactivate) {
      return;
    }

    const updatedMember = {
      ...currentMember,
      status: "active",
    };

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(editingMemberId)) {
          return updatedMember;
        }

        return member;
      })
    );

    setEditMemberStatus("active");
    try {
      await syncMemberToSupabase(updatedMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    alert("Member reactivated");
  }
  async function handleApprovePendingMember(memberId) {
    const pendingMember = members.find(
      (member) => Number(member.id) === Number(memberId)
    );

    if (!pendingMember) {
      alert("Member not found");
      return;
    }

    const updatedMember = {
      ...pendingMember,
      status: "active",
    };

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(memberId)) {
          return updatedMember;
        }

        return member;
      })
    );

    if (Number(editingMemberId) === Number(memberId)) {
      setEditMemberStatus("active");
    }

    try {
      await syncMemberToSupabase(updatedMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    logActivity({
      action: "approve_member",
      targetType: "member",
      targetId: memberId,
      description: `Approved member ${pendingMember.name}`,
    });

    alert("Member approved successfully");
  }

  async function handleRejectPendingMember(memberId) {
    const pendingMember = members.find(
      (member) => Number(member.id) === Number(memberId)
    );

    if (!pendingMember) {
      alert("Member not found");
      return;
    }

    const updatedMember = {
      ...pendingMember,
      status: "inactive",
    };

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(memberId)) {
          return updatedMember;
        }

        return member;
      })
    );

    if (Number(editingMemberId) === Number(memberId)) {
      setEditMemberStatus("inactive");
    }

    try {
      await syncMemberToSupabase(updatedMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    logActivity({
      action: "reject_member",
      targetType: "member",
      targetId: memberId,
      description: `Rejected member ${pendingMember.name}`,
    });

    alert("Member rejected and deactivated");
  }

  async function handleApproveMember() {
    if (editingMemberId === "") {
      alert("Please select a member to edit");
      return;
    }

    await handleApprovePendingMember(editingMemberId);
  }
  async function handleResetMemberPassword() {
    if (editingMemberId === "") {
      alert("Please select a member to edit");
      return;
    }

    if (newPassword.trim() === "") {
      alert("Please enter new password");
      return;
    }

    setUsers((previousUsers) =>
      previousUsers.map((user) => {
        if (Number(user.memberId) === Number(editingMemberId)) {
          return {
            ...user,
            password: newPassword,
          };
        }

        return user;
      })
    );

    setNewPassword("");
    try {
      await syncUserByMemberIdToSupabase(editingMemberId, {
        password: newPassword,
      });
    } catch (error) {
      alertSupabaseUserSyncFailed(error);
      return;
    }

    alert("Password reset successfully");
  }
  async function handleMemberChangePassword() {
    if (memberOldPassword.trim() === "") {
      alert("Please enter your current password");
      return;
    }

    if (memberNewPassword.trim() === "") {
      alert("Please enter new password");
      return;
    }

    if (memberNewPassword !== memberConfirmPassword) {
      alert("New password and confirm password do not match");
      return;
    }

    const loggedInUser = users.find((user) => user.id === currentUser.id);

    if (!loggedInUser) {
      alert("User account not found");
      return;
    }

    if (loggedInUser.password !== memberOldPassword) {
      alert("Current password is incorrect");
      return;
    }

    setUsers((previousUsers) =>
      previousUsers.map((user) => {
        if (user.id === currentUser.id) {
          return {
            ...user,
            password: memberNewPassword,
          };
        }

        return user;
      })
    );

    setMemberOldPassword("");
    setMemberNewPassword("");
    setMemberConfirmPassword("");
    setMemberNewLoginId("");
    setMemberLoginIdPassword("");
    setShowMemberPasswordPanel(false);
    setShowMemberLoginIdPanel(false);

    try {
      await syncUserByMemberIdToSupabase(currentUser.memberId, {
        password: memberNewPassword,
      });
    } catch (error) {
      alertSupabaseUserSyncFailed(error);
      return;
    }

    alert("Password changed successfully");
  }

  async function handleMemberChangeLoginId() {
    const loggedInUser = users.find((user) => user.id === currentUser.id);
    const newLoginId = memberNewLoginId.trim();

    if (!loggedInUser) {
      alert("User account not found");
      return;
    }

    if (newLoginId === "") {
      alert("Please enter new Login ID");
      return;
    }

    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(newLoginId)) {
      alert("Login ID must be 3 to 30 characters and can only contain letters, numbers, dot, dash, and underscore.");
      return;
    }

    if (
      String(loggedInUser.email || "").trim().toLowerCase() ===
      newLoginId.toLowerCase()
    ) {
      alert("This is already your current Login ID.");
      return;
    }

    const loginIdExists = users.some(
      (user) =>
        user.id !== currentUser.id &&
        String(user.email || "").trim().toLowerCase() === newLoginId.toLowerCase()
    );

    if (loginIdExists) {
      alert("This Login ID is already in use");
      return;
    }

    if (memberLoginIdPassword.trim() === "") {
      alert("Please enter your current password");
      return;
    }

    if (loggedInUser.password !== memberLoginIdPassword) {
      alert("Current password is incorrect");
      return;
    }

    const currentMember = members.find(
      (member) => Number(member.id) === Number(currentUser.memberId)
    );
    const updatedMember = currentMember
      ? {
          ...currentMember,
          email: newLoginId,
        }
      : null;

    setUsers((previousUsers) =>
      previousUsers.map((user) => {
        if (user.id === currentUser.id) {
          return {
            ...user,
            email: newLoginId,
          };
        }

        return user;
      })
    );

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(currentUser.memberId)) {
          return updatedMember || { ...member, email: newLoginId };
        }

        return member;
      })
    );

    setCurrentUser({
      ...currentUser,
      email: newLoginId,
    });
    setMemberNewLoginId("");
    setMemberLoginIdPassword("");
    setShowMemberLoginIdPanel(false);

    try {
      await syncUserByMemberIdToSupabase(currentUser.memberId, {
        email: newLoginId,
      });
      if (updatedMember) {
        await syncMemberToSupabase(updatedMember);
      }
    } catch (error) {
      console.error("Supabase login ID sync failed:", error);
      alert(getFriendlyCloudSyncMessage(error));
      return;
    }

    alert("Login ID updated successfully. Please use your new Login ID next time.");
  }

  async function handleMemberUpdateWhatsapp() {
    const normalizedWhatsapp = normalizeWhatsappNumber(memberWhatsappInput);

    if (normalizedWhatsapp === null || normalizedWhatsapp === "") {
      alert("Please enter a valid WhatsApp number");
      return;
    }

    const currentMember = members.find(
      (member) => Number(member.id) === Number(currentUser.memberId)
    );

    if (!currentMember) {
      alert("Member profile not found");
      return;
    }

    const updatedMember = {
      ...currentMember,
      whatsapp: normalizedWhatsapp,
    };

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(currentUser.memberId)) {
          return updatedMember;
        }

        return member;
      })
    );

    setMemberWhatsappInput("");
    setShowWhatsappPrompt(false);

    try {
      await syncMemberToSupabase(updatedMember);
    } catch (error) {
      alertSupabaseMemberSyncFailed(error);
      return;
    }

    alert("WhatsApp number updated successfully.");
  }

  // Reload requests
  async function handleSubmitReloadRequest() {
    if (isSubmittingReloadRequest) {
      return;
    }

    setIsSubmittingReloadRequest(true);
    console.log("Submitting reload request...");
    console.log("Top up amount:", topUpAmount);
    console.log("Payment screenshot:", paymentScreenshot);

    try {
      const amount = Number(topUpAmount);

      if (amount <= 0) {
        alert("Please enter a valid top up amount");
        return;
      }

      if (!paymentScreenshot) {
        alert("Please upload payment screenshot");
        return;
      }

      const memberData = members.find(
        (member) => Number(member.id) === Number(currentUser.memberId)
      );

      if (!memberData) {
        alert("Member profile not found");
        return;
      }

      let uploadedScreenshot;

      try {
        uploadedScreenshot = await withTimeout(
          uploadReloadScreenshot(paymentScreenshot, memberData.id),
          15000,
          "Payment screenshot upload timed out. Please check Supabase Storage bucket reload-screenshots."
        );
      } catch (error) {
        console.error("Reload screenshot upload failed:", error);
        alert(getFriendlyErrorMessage(error));
        return;
      }

      if (!uploadedScreenshot?.screenshotUrl) {
        alert("Failed to upload payment screenshot: missing screenshot URL");
        return;
      }

      const newRequest = {
        id: Date.now(),
        memberId: memberData.id,
        memberName: memberData.name,
        amount: amount,
        screenshotName: uploadedScreenshot.screenshotName,
        screenshotUrl: uploadedScreenshot.screenshotUrl,
        status: "Pending",
        date: new Date().toLocaleDateString(),
      };

      setReloadRequests((previousRequests) => [newRequest, ...previousRequests]);

      try {
        await withTimeout(
          syncReloadRequestToSupabase(newRequest),
          15000,
          "Reload request Supabase sync timed out."
        );
      } catch (error) {
        console.error("Reload request Supabase sync failed:", error);
        alert(getFriendlyCloudSyncMessage(error));
        return;
      }

      setTopUpAmount("");
      setPaymentScreenshot(null);
      setShowTopUpBox(false);
      logActivity({
        action: "submit_reload_request",
        targetType: "reload_request",
        targetId: newRequest.id,
        description: `${memberData.name} submitted reload request RM${amount}`,
      });
      alert("Reload request submitted. Please wait for admin approval.");
    } finally {
      setIsSubmittingReloadRequest(false);
    }
  }

  async function handleApproveReload(request) {
    const currentMember = members.find(
      (member) => Number(member.id) === Number(request.memberId)
    );

    if (!currentMember) {
      alert("Member not found");
      return;
    }

    const updatedBalance = Number(currentMember.balance) + Number(request.amount);

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (Number(member.id) === Number(request.memberId)) {
          return {
            ...member,
            balance: updatedBalance,
          };
        }

        return member;
      })
    );

    setReloadRequests((previousRequests) =>
      previousRequests.map((item) => {
        if (item.id === request.id) {
          return {
            ...item,
            status: "Approved",
          };
        }

        return item;
      })
    );

    const newTransaction = {
      id: Date.now(),
      memberId: request.memberId,
      date: new Date().toLocaleDateString(),
      description: "Reload Approved",
      amount: request.amount,
    };

    setTransactions((previousTransactions) => [
      newTransaction,
      ...previousTransactions,
    ]);

    try {
      await Promise.all([
        syncMemberBalanceToSupabase(request.memberId, updatedBalance),
        syncReloadRequestUpdateToSupabase(request.id, {
          status: "Approved",
        }),
        syncTransactionToSupabase(newTransaction),
      ]);
    } catch (error) {
      alertSupabaseFinanceSyncFailed(error);
      return;
    }

    logActivity({
      action: "approve_reload",
      targetType: "reload_request",
      targetId: request.id,
      description: `Approved reload request for ${request.memberName} RM${request.amount}`,
    });

    alert("Reload approved, balance updated and transaction recorded");
  }

  async function handleRejectReload(requestId) {
    setReloadRequests((previousRequests) =>
      previousRequests.map((item) => {
        if (item.id === requestId) {
          return {
            ...item,
            status: "Rejected",
          };
        }

        return item;
      })
    );

    try {
      await syncReloadRequestUpdateToSupabase(requestId, {
        status: "Rejected",
      });
    } catch (error) {
      alertSupabaseFinanceSyncFailed(error);
      return;
    }

    logActivity({
      action: "reject_reload",
      targetType: "reload_request",
      targetId: requestId,
      description: "Rejected reload request",
      actorName: currentUser?.name || "",
      actorRole: currentUser?.role || "",
      actorId: currentUser?.id || "",
    });

    alert("Reload request rejected");
  }

  // Manual expense split
  function handleToggleExpenseMember(memberId) {
    if (selectedExpenseMembers.includes(memberId)) {
      setSelectedExpenseMembers(
        selectedExpenseMembers.filter((id) => id !== memberId)
      );
    } else {
      setSelectedExpenseMembers([...selectedExpenseMembers, memberId]);
    }
  }

  async function handleChargeExpense() {
    const totalExpense = Number(expenseAmount);

    if (totalExpense <= 0) {
      alert("Please enter a valid expense amount");
      return;
    }

    if (selectedExpenseMembers.length === 0) {
      alert("Please select at least one member");
      return;
    }

    const splitAmount = totalExpense / selectedExpenseMembers.length;
    const affectedMemberBalances = members
      .filter((member) => selectedExpenseMembers.includes(member.id))
      .map((member) => ({
        memberId: member.id,
        balance: Number((member.balance - splitAmount).toFixed(2)),
      }));

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        if (selectedExpenseMembers.includes(member.id)) {
          return {
            ...member,
            balance: Number((member.balance - splitAmount).toFixed(2)),
          };
        }

        return member;
      })
    );

    const newTransactions = selectedExpenseMembers.map((memberId) => ({
      id: Date.now() + memberId,
      memberId: memberId,
      date: new Date().toLocaleDateString(),
      description: "Weekly Club Expense",
      amount: -Number(splitAmount.toFixed(2)),
    }));

    setTransactions((previousTransactions) => [
      ...newTransactions,
      ...previousTransactions,
    ]);

    setExpenseAmount("");
    setSelectedExpenseMembers([]);

    try {
      await Promise.all([
        ...affectedMemberBalances.map((member) =>
          syncMemberBalanceToSupabase(member.memberId, member.balance)
        ),
        syncTransactionsToSupabase(newTransactions),
      ]);
    } catch (error) {
      alertSupabaseFinanceSyncFailed(error);
      return;
    }

    alert(
      `Expense charged successfully. Each member deducted ${formatMoney(
        splitAmount
      )}`
    );
  }

  // Demo reset
  function handleResetDemoData() {
    const confirmReset = prompt("Type RESET to confirm demo data reset.");

    if (confirmReset !== "RESET") {
      alert("Reset cancelled.");
      return;
    }

    const resetUsers = createInitialUsers();
    const resetMembers = initialMembers;
    const resetReloadRequests = [];
    const resetTransactions = initialTransactions;
    const resetSessions = initialSessions;
    const resetSessionBookings = initialSessionBookings;

    setUsers(resetUsers);
    setMembers(resetMembers);
    setReloadRequests(resetReloadRequests);
    setTransactions(resetTransactions);
    setSessions(resetSessions);
    setSessionBookings(resetSessionBookings);
    saveToStorage(STORAGE_KEYS.users, resetUsers);
    saveToStorage(STORAGE_KEYS.members, resetMembers);
    saveToStorage(STORAGE_KEYS.reloadRequests, resetReloadRequests);
    saveToStorage(STORAGE_KEYS.transactions, resetTransactions);
    saveToStorage(STORAGE_KEYS.sessions, resetSessions);
    saveToStorage(STORAGE_KEYS.sessionBookings, resetSessionBookings);
    setSelectedExpenseMembers([]);
    setExpenseAmount("");
    setManualBalance("");
    setMemberSearch("");
    setMemberFilter("all");
    setShowTopUpBox(false);
    setMemberOldPassword("");
    setMemberNewPassword("");
    setMemberConfirmPassword("");
    setMemberNewLoginId("");
    setMemberLoginIdPassword("");
    setShowMemberPasswordPanel(false);
    setShowMemberLoginIdPanel(false);

    alert("Demo data has been reset.");
  }

  // Transaction and account export
  function handleExportTransactions() {
    const allTransactions = transactions.map((transaction) => {
      const member = members.find(
        (member) => Number(member.id) === Number(transaction.memberId)
      );

      return {
        date: transaction.date,
        member: member ? member.name : "Unknown Member",
        description: transaction.description,
        amount: transaction.amount,
      };
    });

    if (allTransactions.length === 0) {
      alert("No transactions to export");
      return;
    }

    const csvHeader = "Date,Member,Description,Amount\n";

    const csvRows = allTransactions
      .map((transaction) => {
        return `${transaction.date},${transaction.member},${transaction.description},${transaction.amount}`;
      })
      .join("\n");

    downloadCsv("byt-transactions.csv", csvHeader + csvRows);
  }
  function handleExportMembers() {
    if (members.length === 0) {
      alert("No members to export");
      return;
    }


    const csvHeader = "Name,Email,Balance,Status\n";

    const csvRows = members
      .map((member) => {
        return `${member.name},${member.email || ""},${member.balance},${member.status}`;
      })
      .join("\n");

    downloadCsv("byt-members-balance.csv", csvHeader + csvRows);
  }
  function handleExportMemberAccounts() {
    const memberAccounts = members.map((member) => {
      const user = users.find(
        (user) =>
          user.role === "member" &&
          Number(user.memberId) === Number(member.id)
      );

      return {
        name: member.name,
        loginId: user ? user.email : `member${member.id}`,
        temporaryPassword: user ? user.password : "123456",
        balance: member.balance,
        status: member.status,
      };
    });

    if (memberAccounts.length === 0) {
      alert("No member accounts to export");
      return;
    }

    const csvHeader = "Name,Login ID,Temporary Password,Balance,Status\n";

    const csvRows = memberAccounts
      .map((account) => {
        return `${account.name},${account.loginId},${account.temporaryPassword},${account.balance},${account.status}`;
      })
      .join("\n");

    downloadCsv("byt-member-accounts.csv", csvHeader + csvRows);
  }

  async function handleTestSupabaseConnection() {
    try {
      const { testSupabaseConnection } = await import(
        "./services/supabaseServices.js"
      );
      const result = await testSupabaseConnection();

      if (result.success) {
        alert("Supabase connected successfully.");
        return;
      }

      console.error("Supabase connection failed:", result.error);
      alert(`Cloud connection failed: ${getFriendlyErrorMessage(result.error)}`);
    } catch (error) {
      console.error("Supabase connection failed:", error);
      alert(`Cloud connection failed: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleSeedMembersToSupabase() {
    const shouldSeed = confirm("Seed current members to Supabase?");

    if (!shouldSeed) {
      return;
    }

    try {
      const { seedMembersToSupabase } = await import(
        "./services/supabaseServices.js"
      );

      await seedMembersToSupabase(members);
      alert("Members seeded to Supabase successfully.");
    } catch (error) {
      console.error("Failed to seed members:", error);
      alert(`Failed to seed members: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleLoadMembersFromSupabase() {
    try {
      const { fetchMembersFromSupabase } = await import(
        "./services/supabaseServices.js"
      );
      const supabaseMembers = await fetchMembersFromSupabase();
      const convertedMembers = convertSupabaseMembers(supabaseMembers);

      setMembers(convertedMembers);
      alert("Members loaded from Supabase successfully.");
    } catch (error) {
      console.error("Failed to load members:", error);
      alert(`Failed to load members: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleLoadUsersFromSupabase() {
    try {
      const { fetchUsersFromSupabase } = await import(
        "./services/supabaseServices.js"
      );
      const supabaseUsers = await fetchUsersFromSupabase();
      const convertedUsers = convertSupabaseUsers(supabaseUsers);

      setUsers(convertedUsers);
      alert("Users loaded from Supabase successfully.");
    } catch (error) {
      console.error("Failed to load users:", error);
      alert(`Failed to load users: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleLoadSessionsFromSupabase() {
    try {
      const { fetchSessionsFromSupabase } = await import(
        "./services/supabaseServices.js"
      );
      const supabaseSessions = await fetchSessionsFromSupabase();
      const convertedSessions = convertSupabaseSessions(supabaseSessions);

      setSessions(convertedSessions);
      alert("Sessions loaded from Supabase successfully.");
    } catch (error) {
      console.error("Failed to load sessions:", error);
      alert(`Failed to load sessions: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleLoadSessionBookingsFromSupabase() {
    try {
      const { fetchSessionBookingsFromSupabase } = await import(
        "./services/supabaseServices.js"
      );
      const supabaseBookings = await fetchSessionBookingsFromSupabase();
      const convertedBookings =
        convertSupabaseSessionBookings(supabaseBookings);

      setSessionBookings(convertedBookings);
      alert("Session bookings loaded from Supabase successfully.");
    } catch (error) {
      console.error("Failed to load session bookings:", error);
      alert(
        `Failed to load session bookings: ${getFriendlyErrorMessage(error)}`
      );
    }
  }

  async function handleLoadTransactionsFromSupabase() {
    try {
      const { fetchTransactionsFromSupabase } = await import(
        "./services/supabaseServices.js"
      );
      const supabaseTransactions = await fetchTransactionsFromSupabase();
      const convertedTransactions =
        convertSupabaseTransactions(supabaseTransactions);

      setTransactions(convertedTransactions);
      alert("Transactions loaded from Supabase successfully.");
    } catch (error) {
      console.error("Failed to load transactions:", error);
      alert(`Failed to load transactions: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleLoadReloadRequestsFromSupabase() {
    try {
      const { fetchReloadRequestsFromSupabase } = await import(
        "./services/supabaseServices.js"
      );
      const supabaseReloadRequests = await fetchReloadRequestsFromSupabase();
      const convertedReloadRequests = convertSupabaseReloadRequests(
        supabaseReloadRequests
      );

      setReloadRequests(convertedReloadRequests);
      alert("Reload requests loaded from Supabase successfully.");
    } catch (error) {
      console.error("Failed to load reload requests:", error);
      alert(
        `Failed to load reload requests: ${getFriendlyErrorMessage(error)}`
      );
    }
  }

  async function handleSeedUsersToSupabase() {
    const shouldSeed = confirm("Seed current users to Supabase?");

    if (!shouldSeed) {
      return;
    }

    try {
      const { seedUsersToSupabase } = await import(
        "./services/supabaseServices.js"
      );

      await seedUsersToSupabase(users);
      alert("Users seeded to Supabase successfully.");
    } catch (error) {
      console.error("Failed to seed users:", error);
      alert(`Failed to seed users: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleSeedSessionsToSupabase() {
    const shouldSeed = confirm("Seed current sessions to Supabase?");

    if (!shouldSeed) {
      return;
    }

    try {
      const { seedSessionsToSupabase } = await import(
        "./services/supabaseServices.js"
      );

      await seedSessionsToSupabase(sessions);
      alert("Sessions seeded to Supabase successfully.");
    } catch (error) {
      console.error("Failed to seed sessions:", error);
      alert(`Failed to seed sessions: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleSeedSessionBookingsToSupabase() {
    const shouldSeed = confirm(
      "Seed current session bookings to Supabase? Please seed members and sessions first."
    );

    if (!shouldSeed) {
      return;
    }

    try {
      const { seedSessionBookingsToSupabase } = await import(
        "./services/supabaseServices.js"
      );

      await seedSessionBookingsToSupabase(sessionBookings);
      alert("Session bookings seeded to Supabase successfully.");
    } catch (error) {
      console.error("Failed to seed session bookings:", error);
      alert(
        `Failed to seed session bookings: ${getFriendlyErrorMessage(error)}`
      );
    }
  }

  async function handleSeedTransactionsToSupabase() {
    const shouldSeed = confirm(
      "Seed current transactions to Supabase? Please seed members first."
    );

    if (!shouldSeed) {
      return;
    }

    try {
      const { seedTransactionsToSupabase } = await import(
        "./services/supabaseServices.js"
      );

      await seedTransactionsToSupabase(transactions);
      alert("Transactions seeded to Supabase successfully.");
    } catch (error) {
      console.error("Failed to seed transactions:", error);
      alert(`Failed to seed transactions: ${getFriendlyErrorMessage(error)}`);
    }
  }

  async function handleSeedReloadRequestsToSupabase() {
    const shouldSeed = confirm(
      "Seed current reload requests to Supabase? Please seed members first."
    );

    if (!shouldSeed) {
      return;
    }

    try {
      const { seedReloadRequestsToSupabase } = await import(
        "./services/supabaseServices.js"
      );

      await seedReloadRequestsToSupabase(reloadRequests);
      alert("Reload requests seeded to Supabase successfully.");
    } catch (error) {
      console.error("Failed to seed reload requests:", error);
      alert(
        `Failed to seed reload requests: ${getFriendlyErrorMessage(error)}`
      );
    }
  }

  // Booking and session charging
  function normalizeCutoffTime(value) {
    const rawValue = String(value || "12:00").trim().toUpperCase();
    const match = rawValue.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);

    if (!match) {
      return "12:00";
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const period = match[3];

    if (minutes < 0 || minutes > 59) {
      return "12:00";
    }

    if (period) {
      if (hours < 1 || hours > 12) {
        return "12:00";
      }

      if (period === "AM" && hours === 12) {
        hours = 0;
      }

      if (period === "PM" && hours < 12) {
        hours += 12;
      }
    } else if (hours < 0 || hours > 23) {
      return "12:00";
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  function isPastCancelCutoff(session) {
    if (!session || !session.date) {
      return false;
    }

    const cutoffTime = normalizeCutoffTime(session.cancelCutoff);
    const cutoffDateTime = new Date(`${session.date}T${cutoffTime}:00`);

    if (Number.isNaN(cutoffDateTime.getTime())) {
      return false;
    }

    const now = new Date();

    return now >= cutoffDateTime;
  }

  function getSessionBookings(sessionId) {
    return sessionBookings.filter((booking) => booking.sessionId === sessionId);
  }

  function getActiveSessionBookings(sessionId) {
    return sessionBookings.filter(
      (booking) =>
        booking.sessionId === sessionId &&
        booking.status !== "cancelled"
    );
  }

  function getSessionShuttlecockFee(session) {
    return Number(session.shuttlecockUsed || 0) * Number(session.shuttlecockRate || 0);
  }

  function getSessionChargeSummary(session, bookings) {
    const courtBookings = bookings.filter((booking) =>
      courtChargeStatuses.includes(booking.status)
    );

    const attendedBookings = bookings.filter(
      (booking) => booking.status === "attended"
    );

    const courtFeeTotal = Number(session.courtFeeTotal || 0);
    const shuttlecockFeeTotal = getSessionShuttlecockFee(session);
    const otherFeeTotal = Number(session.otherFeeTotal || 0);
    const attendedFeeTotal = shuttlecockFeeTotal + otherFeeTotal;
    const courtFeePerPlayer =
      courtBookings.length > 0 ? courtFeeTotal / courtBookings.length : 0;
    const attendedFeePerPlayer =
      attendedBookings.length > 0
        ? attendedFeeTotal / attendedBookings.length
        : 0;

    const chargeRows = bookings
      .map((booking) => {
        const courtAmount = courtChargeStatuses.includes(booking.status)
          ? courtFeePerPlayer
          : 0;
        const attendedAmount =
          booking.status === "attended" ? attendedFeePerPlayer : 0;

        return {
          bookingId: booking.id,
          memberId: booking.memberId,
          bookingStatus: booking.status,
          courtAmount: courtAmount,
          attendedAmount: attendedAmount,
          amount: courtAmount + attendedAmount,
        };
      })
      .filter((charge) => charge.amount > 0);

    return {
      courtBookings: courtBookings,
      attendedBookings: attendedBookings,
      courtFeeTotal: courtFeeTotal,
      shuttlecockFeeTotal: shuttlecockFeeTotal,
      otherFeeTotal: otherFeeTotal,
      attendedFeeTotal: attendedFeeTotal,
      courtFeePerPlayer: courtFeePerPlayer,
      attendedFeePerPlayer: attendedFeePerPlayer,
      chargeRows: chargeRows,
    };
  }

  async function handleCreateSession() {
    if (newSessionDate === "") {
      alert("Please select session date");
      return;
    }

    if (newSessionTime.trim() === "") {
      alert("Please enter session time");
      return;
    }

    if (newSessionVenue.trim() === "") {
      alert("Please enter venue");
      return;
    }

    if (Number(newSessionCourtCount) <= 0) {
      alert("Please enter valid court count");
      return;
    }

    if (Number(newSessionMaxPlayers) <= 0) {
      alert("Please enter valid max players");
      return;
    }

    if (Number(newSessionCourtFeeTotal) <= 0) {
      alert("Please enter valid court fee total");
      return;
    }

    const newSession = {
      id: Date.now(),
      date: newSessionDate,
      time: newSessionTime,
      venue: newSessionVenue,
      courtCount: Number(newSessionCourtCount),
      maxPlayers: Number(newSessionMaxPlayers),
      courtFeeTotal: Number(newSessionCourtFeeTotal),
      cancelCutoff: normalizeCutoffTime(newSessionCancelCutoff || "12:00"),
      status: "open",
      chargeStatus: "not_charged",
      shuttlecockUsed: 0,
      shuttlecockRate: 11,
      otherFeeTotal: 0,
    };

    setSessions((previousSessions) => [newSession, ...previousSessions]);

    setNewSessionDate("");
    setNewSessionTime("");
    setNewSessionVenue("");
    setNewSessionCourtCount("");
    setNewSessionMaxPlayers("");
    setNewSessionCourtFeeTotal("");
    setNewSessionCancelCutoff("12:00");

    try {
      await syncSessionToSupabase(newSession);
    } catch (error) {
      alertSupabaseSessionSyncFailed(error);
      return;
    }

    alert("Session created successfully");
  }

  async function handleBookSession(sessionId) {
    const session = sessions.find((session) => session.id === sessionId);
    const currentMember = members.find(
      (member) => Number(member.id) === Number(currentUser.memberId)
    );

    if (!session) {
      alert("Session not found");
      return;
    }

    if (session.status !== "open") {
      alert("This session is not open for booking");
      return;
    }

    if (!currentMember) {
      alert("Member profile not found");
      return;
    }

    if (Number(currentMember.balance) < MINIMUM_BOOKING_BALANCE) {
      alert("Your balance is below RM15. Please reload before booking.");
      return;
    }

    const activeBookings = getActiveSessionBookings(sessionId);

    if (activeBookings.length >= session.maxPlayers) {
      alert("This session is already full");
      return;
    }

    const alreadyBooked = sessionBookings.some(
      (booking) =>
        booking.sessionId === sessionId &&
        Number(booking.memberId) === Number(currentUser.memberId) &&
        booking.status !== "cancelled"
    );

    if (alreadyBooked) {
      alert("You have already booked this session");
      return;
    }

    const newBooking = {
      id: Date.now(),
      sessionId: sessionId,
      memberId: currentUser.memberId,
      status: "booked",
      bookedAt: new Date().toLocaleString(),
    };

    setSessionBookings((previousBookings) => [
      newBooking,
      ...previousBookings,
    ]);

    try {
      await syncSessionBookingToSupabase(newBooking);
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
      return;
    }

    logActivity({
      action: "book_session",
      targetType: "session",
      targetId: sessionId,
      description: `${currentMember.name} booked session ${session.date}`,
    });

    alert("Booking successful");
  }

  async function handleCancelSessionBooking(sessionId) {
    const session = sessions.find((session) => session.id === sessionId);
    const memberData = members.find(
      (member) => Number(member.id) === Number(currentUser.memberId)
    );

    if (!session) {
      alert("Session not found");
      return;
    }

    const booking = sessionBookings.find(
      (booking) =>
        booking.sessionId === sessionId &&
        Number(booking.memberId) === Number(currentUser.memberId) &&
        booking.status === "booked"
    );

    if (!booking) {
      alert("Booking not found");
      return;
    }

    if (isPastCancelCutoff(session)) {
      const updatedBooking = {
        ...booking,
        status: "late_cancel",
        cancelledAt: new Date().toLocaleString(),
      };

      setSessionBookings((previousBookings) =>
        previousBookings.map((item) => {
          if (item.id === booking.id) {
            return updatedBooking;
          }

          return item;
        })
      );

      try {
        await syncSessionBookingUpdateToSupabase(booking.id, {
          status: updatedBooking.status,
          cancelledAt: updatedBooking.cancelledAt,
        });
      } catch (error) {
        alertSupabaseBookingSyncFailed(error);
        return;
      }

      logActivity({
        action: "cancel_session_booking",
        targetType: "session",
        targetId: sessionId,
        description: `${
          memberData?.name || currentUser.name
        } cancelled session ${session.date}`,
      });

      alert("Cancel cutoff has passed. You will still be charged court fee.");
      return;
    }

    const updatedBooking = {
      ...booking,
      status: "cancelled",
      cancelledAt: new Date().toLocaleString(),
    };

    setSessionBookings((previousBookings) =>
      previousBookings.map((item) => {
        if (item.id === booking.id) {
          return updatedBooking;
        }

        return item;
      })
    );

    try {
      await syncSessionBookingUpdateToSupabase(booking.id, {
        status: updatedBooking.status,
        cancelledAt: updatedBooking.cancelledAt,
      });
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
      return;
    }

    logActivity({
      action: "cancel_session_booking",
      targetType: "session",
      targetId: sessionId,
      description: `${
        memberData?.name || currentUser.name
      } cancelled session ${session.date}`,
    });

    alert("Booking cancelled successfully");
  }

  async function handleUpdateBookingStatus(bookingId, status) {
    const updatedAt = new Date().toLocaleString();

    setSessionBookings((previousBookings) =>
      previousBookings.map((booking) => {
        if (booking.id === bookingId) {
          return {
            ...booking,
            status: status,
            statusUpdatedAt: updatedAt,
          };
        }

        return booking;
      })
    );

    try {
      await syncSessionBookingUpdateToSupabase(bookingId, {
        status: status,
        statusUpdatedAt: updatedAt,
      });
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
    }
  }

  async function handleBulkUpdateSessionBookingStatus(sessionId, action) {
    const statusUpdatedAt = new Date().toLocaleString();
    const changedBookings = sessionBookings
      .filter((booking) => Number(booking.sessionId) === Number(sessionId))
      .map((booking) => {
        if (action === "mark_booked_attended" && booking.status === "booked") {
          return {
            ...booking,
            status: "attended",
            statusUpdatedAt: statusUpdatedAt,
          };
        }

        if (
          action === "reset_non_cancelled_booked" &&
          booking.status !== "cancelled"
        ) {
          return {
            ...booking,
            status: "booked",
            statusUpdatedAt: statusUpdatedAt,
          };
        }

        return null;
      })
      .filter(Boolean);

    setSessionBookings((previousBookings) =>
      previousBookings.map((booking) => {
        return (
          changedBookings.find((updatedBooking) => updatedBooking.id === booking.id) ||
          booking
        );
      })
    );

    if (changedBookings.length === 0) {
      return;
    }

    try {
      await Promise.all(
        changedBookings.map((booking) =>
          syncSessionBookingUpdateToSupabase(booking.id, {
            status: booking.status,
            statusUpdatedAt: booking.statusUpdatedAt,
          })
        )
      );
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
    }
  }

  async function handleUpdateSessionChargeField(sessionId, field, value) {
    setSessions((previousSessions) =>
      previousSessions.map((session) => {
        if (Number(session.id) === Number(sessionId)) {
          return {
            ...session,
            [field]: value,
          };
        }

        return session;
      })
    );

    try {
      await syncSessionUpdateToSupabase(sessionId, {
        [field]: value,
      });
    } catch (error) {
      alertSupabaseSessionSyncFailed(error);
    }
  }

  async function handleFinalizeSessionCharge(sessionId) {
    const session = sessions.find((session) => session.id === sessionId);

    if (!session) {
      alert("Session not found");
      return;
    }

    if (session.chargeStatus === "charged") {
      alert("This session has already been charged");
      return;
    }

    const allBookings = getSessionBookings(sessionId);
    const chargeSummary = getSessionChargeSummary(session, allBookings);

    if (chargeSummary.courtBookings.length === 0) {
      alert("No chargeable booking found. Cancelled players are not charged.");
      return;
    }

    if (
      chargeSummary.attendedFeeTotal > 0 &&
      chargeSummary.attendedBookings.length === 0
    ) {
      alert("Please mark at least one player as attended before charging shuttlecock or other fees.");
      return;
    }

    if (chargeSummary.chargeRows.length === 0) {
      alert("No member charge was calculated");
      return;
    }

    const finalizedAt = new Date().toLocaleString();
    const finalizedSessionUpdates = {
      status: "closed",
      chargeStatus: "charged",
      chargedAt: finalizedAt,
      finalizedCourtChargePerPlayer: chargeSummary.courtFeePerPlayer,
      finalizedAttendedChargePerPlayer: chargeSummary.attendedFeePerPlayer,
    };
    const transactionDate = new Date().toLocaleDateString();
    const transactionIdBase = Date.now();
    const newTransactions = chargeSummary.chargeRows.map((charge, index) => ({
      id: transactionIdBase + index,
      memberId: charge.memberId,
      date: transactionDate,
      description: `Session Charge - ${session.date}`,
      amount: -Number(charge.amount.toFixed(2)),
    }));
    const affectedMemberBalances = members
      .map((member) => {
        const charge = chargeSummary.chargeRows.find(
          (item) => Number(item.memberId) === Number(member.id)
        );

        if (!charge) {
          return null;
        }

        return {
          memberId: member.id,
          balance: Number((member.balance - charge.amount).toFixed(2)),
        };
      })
      .filter(Boolean);

    setMembers((previousMembers) =>
      previousMembers.map((member) => {
        const charge = chargeSummary.chargeRows.find(
          (item) => Number(item.memberId) === Number(member.id)
        );

        if (charge) {
          return {
            ...member,
            balance: Number((member.balance - charge.amount).toFixed(2)),
          };
        }

        return member;
      })
    );

    setTransactions((previousTransactions) => [
      ...newTransactions,
      ...previousTransactions,
    ]);

    setSessions((previousSessions) =>
      previousSessions.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            ...finalizedSessionUpdates,
          };
        }

        return session;
      })
    );

    try {
      await syncSessionUpdateToSupabase(sessionId, finalizedSessionUpdates);
    } catch (error) {
      alertSupabaseSessionSyncFailed(error);
      return;
    }

    try {
      await Promise.all([
        ...affectedMemberBalances.map((member) =>
          syncMemberBalanceToSupabase(member.memberId, member.balance)
        ),
        syncTransactionsToSupabase(newTransactions),
      ]);
    } catch (error) {
      alertSupabaseFinanceSyncFailed(error);
      return;
    }

    logActivity({
      action: "finalize_session_charge",
      targetType: "session",
      targetId: sessionId,
      description: `Finalized session charge for ${session.date}`,
    });

    alert(
      `Session finalized. ${chargeSummary.chargeRows.length} member(s) charged.`
    );
  }

  async function handleCloseSession(sessionId) {
    setSessions((previousSessions) =>
      previousSessions.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            status: "closed",
          };
        }

        return session;
      })
    );

    try {
      await syncSessionUpdateToSupabase(sessionId, {
        status: "closed",
      });
    } catch (error) {
      alertSupabaseSessionSyncFailed(error);
      return;
    }

    alert("Session booking closed");
  }

  async function handleOpenSession(sessionId) {
    const sessionToOpen = sessions.find((session) => session.id === sessionId);

    if (!sessionToOpen) {
      alert("Session not found");
      return;
    }

    if (sessionToOpen.chargeStatus === "charged") {
      alert("Charged sessions cannot be reopened");
      return;
    }

    setSessions((previousSessions) =>
      previousSessions.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            status: "open",
          };
        }

        return session;
      })
    );

    try {
      await syncSessionUpdateToSupabase(sessionId, {
        status: "open",
      });
    } catch (error) {
      alertSupabaseSessionSyncFailed(error);
      return;
    }

    alert("Session booking opened");
  }

  if (page === "admin") {
    const totalClubBalance = members.reduce(
      (total, member) => total + member.balance,
      0
    );

    const lowBalanceCount = members.filter(
      (member) => member.balance >= 0 && member.balance < 30
    ).length;

    const negativeBalanceCount = members.filter(
      (member) => member.balance < 0
    ).length;
    const activeMemberCount = members.filter(
      (member) => member.status === "active"
    ).length;

    const pendingRequests = reloadRequests
      .filter((request) => request.status === "Pending")
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    const pendingMembers = members
      .filter((member) => member.status === "pending")
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    const allTransactions = transactions.map((transaction) => {
      const member = members.find(
        (member) => Number(member.id) === Number(transaction.memberId)
      );

      return {
        ...transaction,
        memberName: member ? member.name : "Unknown Member",
      };
    });
    const filteredTransactions = allTransactions
      .filter((transaction) => {
        const searchText = transactionSearch.toLowerCase();

        const matchesSearch =
          transaction.memberName.toLowerCase().includes(searchText) ||
          transaction.description.toLowerCase().includes(searchText);

        const matchesFilter =
          transactionFilter === "all" ||
          (transactionFilter === "reload" &&
            transaction.description.toLowerCase().includes("reload")) ||
          (transactionFilter === "expense" &&
            transaction.description.toLowerCase().includes("expense"));

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    const adminPendingReloadPageSize = 10;
    const adminTransactionPageSize = 10;
    const pendingMemberApprovalPageSize = 10;
    const adminPendingReloadTotalPages = Math.max(
      1,
      Math.ceil(pendingRequests.length / adminPendingReloadPageSize)
    );
    const adminTransactionTotalPages = Math.max(
      1,
      Math.ceil(filteredTransactions.length / adminTransactionPageSize)
    );
    const pendingMemberApprovalTotalPages = Math.max(
      1,
      Math.ceil(pendingMembers.length / pendingMemberApprovalPageSize)
    );
    const safeAdminPendingReloadPage = Math.min(
      adminPendingReloadPage,
      adminPendingReloadTotalPages
    );
    const safeAdminTransactionPage = Math.min(
      adminTransactionPage,
      adminTransactionTotalPages
    );
    const safePendingMemberApprovalPage = Math.min(
      pendingMemberApprovalPage,
      pendingMemberApprovalTotalPages
    );
    const paginatedPendingRequests = pendingRequests.slice(
      (safeAdminPendingReloadPage - 1) * adminPendingReloadPageSize,
      safeAdminPendingReloadPage * adminPendingReloadPageSize
    );
    const paginatedTransactions = filteredTransactions.slice(
      (safeAdminTransactionPage - 1) * adminTransactionPageSize,
      safeAdminTransactionPage * adminTransactionPageSize
    );
    const paginatedPendingMembers = pendingMembers.slice(
      (safePendingMemberApprovalPage - 1) * pendingMemberApprovalPageSize,
      safePendingMemberApprovalPage * pendingMemberApprovalPageSize
    );

    const filteredMembers = members.filter((member) => {
      const matchesSearch = (member.name || "").toLowerCase().includes(memberSearch.toLowerCase());
      const matchesFilter =
        memberFilter === "all" ||
        (memberFilter === "pending" && member.status === "pending") ||
        (memberFilter === "good" && member.balance >= 30) ||
        (memberFilter === "low" && member.balance >= 0 && member.balance < 30) ||
        (memberFilter === "negative" && member.balance < 0);
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="dashboard-page">
        <TopBar
          title="BYT Club Wallet"
          subtitle="Admin Dashboard"
          onLogout={handleLogout}
          showResetButton={false}
        />

        <div className="dashboard-content">
          <h1>Admin Dashboard</h1>
          <p className="dashboard-subtitle">
            Manage member balances, reload requests and club expenses.
          </p>
          <div className="system-status-row">
            <span className="system-status-badge">Mode: {APP_DATA_MODE}</span>
            <span className="system-status-badge">Version: {APP_VERSION}</span>
            <span className="system-status-badge">
              Environment: {APP_ENVIRONMENT}
            </span>
          </div>
          {renderSupabaseLoadNotice()}

          <AdminStats
            totalClubBalance={totalClubBalance}
            activeMemberCount={activeMemberCount}
            pendingRequestCount={pendingRequests.length}
            negativeBalanceCount={negativeBalanceCount}
            formatMoney={formatMoney}
          />

          <div className="dashboard-section-toggle-grid">
            <button
              className={`dashboard-section-toggle ${showMembersSection ? "active" : ""}`}
              onClick={() => setShowMembersSection(!showMembersSection)}
            >
              Members
            </button>

            <button
              className={`dashboard-section-toggle ${showBalanceToolsSection ? "active" : ""}`}
              onClick={() =>
                setShowBalanceToolsSection(!showBalanceToolsSection)
              }
            >
              Balance
            </button>

            <button
              className={`dashboard-section-toggle ${showBookingSection ? "active" : ""}`}
              onClick={() => setShowBookingSection(!showBookingSection)}
            >
              Booking
            </button>

            <button
              className={`dashboard-section-toggle ${showTransactionsSection ? "active" : ""}`}
              onClick={() =>
                setShowTransactionsSection(!showTransactionsSection)
              }
            >
              Transactions
            </button>

            <button
              className={`dashboard-section-toggle ${showActivitySection ? "active" : ""}`}
              onClick={() => setShowActivitySection(!showActivitySection)}
            >
              Activity
            </button>

            <button
              className={`dashboard-section-toggle ${showDeveloperTools ? "active" : ""}`}
              onClick={() => {
                const nextShowDeveloperTools = !showDeveloperTools;
                setShowDeveloperTools(nextShowDeveloperTools);

                if (!nextShowDeveloperTools) {
                  setIsDeveloperToolsUnlocked(false);
                  setDeveloperToolsUnlockText("");
                }
              }}
            >
              Developer
            </button>
          </div>

          {showDeveloperTools && (
            <div className="panel developer-tools-panel">
              {!isDeveloperToolsUnlocked ? (
                <div className="developer-tools-locked">
                  <div className="panel-header">
                    <div>
                      <h2>Developer Sync Tools Locked</h2>
                      <p>
                        These tools are for migration and emergency sync only.
                      </p>
                    </div>
                  </div>

                  <div className="developer-tools-unlock-row">
                    <input
                      type="text"
                      value={developerToolsUnlockText}
                      onChange={(event) =>
                        setDeveloperToolsUnlockText(event.target.value)
                      }
                      placeholder="Type DEVELOPER to unlock"
                    />
                    <button
                      className="secondary-button compact-button"
                      onClick={() => {
                        if (developerToolsUnlockText === "DEVELOPER") {
                          setIsDeveloperToolsUnlocked(true);
                          setDeveloperToolsUnlockText("");
                          return;
                        }

                        alert("Developer tools remain locked.");
                      }}
                    >
                      Unlock Developer Tools
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="panel-header">
                    <div>
                      <h2>Developer Sync Tools</h2>
                      <p>
                        Use these tools only for data migration, testing, or emergency sync.
                      </p>
                    </div>
                    <button
                      className="secondary-button compact-button developer-tools-lock-button"
                      onClick={() => {
                        setIsDeveloperToolsUnlocked(false);
                        setDeveloperToolsUnlockText("");
                      }}
                    >
                      Lock Developer Tools
                    </button>
                  </div>

                  <div className="developer-tools-grid">
                    <button
                      className="secondary-button compact-button"
                      onClick={handleTestSupabaseConnection}
                    >
                      Test Supabase Connection
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleLoadMembersFromSupabase}
                    >
                      Load Members from Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleLoadUsersFromSupabase}
                    >
                      Load Users from Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleLoadSessionsFromSupabase}
                    >
                      Load Sessions from Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleLoadSessionBookingsFromSupabase}
                    >
                      Load Session Bookings from Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleLoadTransactionsFromSupabase}
                    >
                      Load Transactions from Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleLoadReloadRequestsFromSupabase}
                    >
                      Load Reload Requests from Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleSeedMembersToSupabase}
                    >
                      Seed Members to Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleSeedUsersToSupabase}
                    >
                      Seed Users to Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleSeedSessionsToSupabase}
                    >
                      Seed Sessions to Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleSeedSessionBookingsToSupabase}
                    >
                      Seed Session Bookings to Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleSeedTransactionsToSupabase}
                    >
                      Seed Transactions to Supabase
                    </button>

                    <button
                      className="secondary-button compact-button"
                      onClick={handleSeedReloadRequestsToSupabase}
                    >
                      Seed Reload Requests to Supabase
                    </button>

                    <button
                      className="danger-button compact-button"
                      onClick={handleResetDemoData}
                    >
                      Danger: Reset Local Demo Data
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {showActivitySection && (
          <div className="panel recent-activity-panel collapsible-section">
            <div className="panel-header">
              <div>
                <h2>Recent Activity</h2>
                <p>Latest audit logs from important admin and member actions.</p>
              </div>

              <button
                className="secondary-button compact-button"
                onClick={() => handleLoadRecentActivityLogs()}
                disabled={isLoadingActivityLogs}
              >
                {isLoadingActivityLogs ? "Loading..." : "Refresh Activity"}
              </button>
            </div>

            {isLoadingActivityLogs ? (
              <p className="empty-text">Loading activity...</p>
            ) : activityLogs.length === 0 ? (
              <p className="empty-text">No activity yet.</p>
            ) : (
              <table className="activity-log-table">
                <thead>
                  <tr>
                    <th>Date/time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Description</th>
                  </tr>
                </thead>

                <tbody>
                  {activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : ""}
                      </td>
                      <td>
                        {log.actor_name ||
                          log.actor_role ||
                          log.actor_id ||
                          "Unknown"}
                      </td>
                      <td>{log.action}</td>
                      <td>{log.description || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}

          {pendingMembers.length > 0 && (
            <div className="panel pending-member-approvals-panel">
              <h2>Pending Member Approvals</h2>

              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Login ID / Email</th>
                    <th>Balance</th>
                    <th>Registered Type</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedPendingMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.email || "-"}</td>
                      <td className={member.balance < 0 ? "negative" : "positive"}>
                        {formatMoney(member.balance)}
                      </td>
                      <td>{member.memberType || "-"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="small-approve-button"
                            onClick={() => handleApprovePendingMember(member.id)}
                          >
                            Approve
                          </button>

                          <button
                            className="small-reject-button"
                            onClick={() => handleRejectPendingMember(member.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pendingMembers.length > pendingMemberApprovalPageSize && (
                <div className="pagination-controls">
                  <button
                    className="pagination-button"
                    disabled={safePendingMemberApprovalPage === 1}
                    onClick={() =>
                      setPendingMemberApprovalPage(
                        safePendingMemberApprovalPage - 1
                      )
                    }
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {safePendingMemberApprovalPage} of{" "}
                    {pendingMemberApprovalTotalPages}
                  </span>
                  <button
                    className="pagination-button"
                    disabled={
                      safePendingMemberApprovalPage ===
                      pendingMemberApprovalTotalPages
                    }
                    onClick={() =>
                      setPendingMemberApprovalPage(
                        safePendingMemberApprovalPage + 1
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {showMembersSection && (
            <section className="collapsible-section">
              <div className="collapsible-section-header">
                <div>
                  <h2>Members Management</h2>
                  <p>Search, edit, export, and manage club members.</p>
                </div>
              </div>

              <div className="dashboard-section-stack">
                <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Members</h2>
                  <p>Search and filter club members.</p>
                </div>

                <div className="small-button-row">
                  <button className="secondary-button" onClick={handleExportMembers}>
                    Export Members
                  </button>

                  <button className="secondary-button" onClick={handleExportMemberAccounts}>
                    Export Accounts
                  </button>
                </div>
              </div>

              <div className="member-tools">
                <input
                  type="text"
                  placeholder="Search member name..."
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                />

                <select
                  value={memberFilter}
                  onChange={(event) => setMemberFilter(event.target.value)}
                >
                  <option value="all">All Members</option>
                  <option value="pending">Pending Approval</option>
                  <option value="good">Good Balance</option>
                  <option value="low">Low Balance</option>
                  <option value="negative">Need Reload</option>
                </select>
              </div>

              <MemberTable
                filteredMembers={filteredMembers}
                formatMoney={formatMoney}
                onEditMember={handleStartEditMember}
              />

              {editingMemberId !== "" ? (
                <EditMemberPanel
                  editMemberBalance={editMemberBalance}
                  editMemberEmail={editMemberEmail}
                  editMemberName={editMemberName}
                  editMemberStatus={editMemberStatus}
                  editMemberWhatsapp={editMemberWhatsapp}
                  editingMemberId={editingMemberId}
                  handleCancelEditMember={handleCancelEditMember}
                  handleDeactivateMember={handleDeactivateMember}
                  handleApproveMember={handleApproveMember}
                  handleReactivateMember={handleReactivateMember}
                  handleResetMemberPassword={handleResetMemberPassword}
                  handleUpdateMemberInfo={handleUpdateMemberInfo}
                  newPassword={newPassword}
                  selectedMember={members.find(
                    (member) => Number(member.id) === Number(editingMemberId)
                  )}
                  setEditMemberBalance={setEditMemberBalance}
                  setEditMemberEmail={setEditMemberEmail}
                  setEditMemberName={setEditMemberName}
                  setEditMemberStatus={setEditMemberStatus}
                  setEditMemberWhatsapp={setEditMemberWhatsapp}
                  setNewPassword={setNewPassword}
                />
              ) : null}
            </div>

                <div className="panel add-member-panel">
                  <h2>Add New Member</h2>

                  <div className="add-member-grid">
                    <div>
                      <label>Member Name</label>
                      <input
                        type="text"
                        placeholder="Example: Alex Tan"
                        value={newMemberName}
                        onChange={(event) => setNewMemberName(event.target.value)}
                      />
                    </div>

                    <div>
                      <label>Login ID / Email</label>
                      <input
                        type="text"
                        placeholder="Example: alex@byt.club"
                        value={newMemberEmail}
                        onChange={(event) => setNewMemberEmail(event.target.value)}
                      />
                    </div>

                    <div>
                      <label>Starting Balance</label>
                      <input
                        type="number"
                        placeholder="Example: 0"
                        value={newMemberBalance}
                        onChange={(event) => setNewMemberBalance(event.target.value)}
                      />
                    </div>
                  </div>

                  <button className="action-button add-member-button" onClick={handleAddMember}>
                    Add Member
                  </button>
                </div>
              </div>
            </section>
          )}

          {showBalanceToolsSection && (
            <section className="collapsible-section">
              <div className="collapsible-section-header">
                <div>
                  <h2>Balance & Calculator</h2>
                  <p>Adjust balances, split expenses, and estimate session charges.</p>
                </div>
              </div>

              <div className="balance-tools-grid">
                <SessionCalculator
                  members={members}
                  setMembers={setMembers}
                  setTransactions={setTransactions}
                  formatMoney={formatMoney}
                />

                <div className="balance-side-stack">
                  <div className="panel">
                    <h2>Manual Balance Update</h2>

                    <label>Member</label>
                    <select
                      value={selectedMemberId}
                      onChange={(event) => setSelectedMemberId(event.target.value)}
                    >
                      {members
                        .filter((member) => member.status === "active")
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                    </select>

                    <label>New Balance</label>
                    <input
                      type="number"
                      placeholder="Example: 100 or -50"
                      value={manualBalance}
                      onChange={(event) => setManualBalance(event.target.value)}
                    />

                    <button
                      className="action-button"
                      onClick={handleManualBalanceUpdate}
                    >
                      Update Balance
                    </button>
                  </div>

                  <div className="panel">
                    <h2>Weekly Expense</h2>

                    <label>Total Expense</label>
                    <input
                      type="number"
                      placeholder="Example: 175.20"
                      value={expenseAmount}
                      onChange={(event) => setExpenseAmount(event.target.value)}
                    />

                    <div className="expense-summary">
                      <p>
                        Selected Members: <strong>{selectedExpenseMembers.length}</strong>
                      </p>

                      <p>
                        Split Amount:{" "}
                        <strong>
                          {selectedExpenseMembers.length > 0 && Number(expenseAmount) > 0
                            ? formatMoney(
                              Number(expenseAmount) / selectedExpenseMembers.length
                            )
                            : "RM0.00"}
                        </strong>
                      </p>
                    </div>

                    <div className="member-checkbox-list">
                      {members
                        .filter((member) => member.status === "active")
                        .map((member) => (
                          <label key={member.id} className="member-checkbox-row">
                            <input
                              type="checkbox"
                              checked={selectedExpenseMembers.includes(member.id)}
                              onChange={() => handleToggleExpenseMember(member.id)}
                            />

                            <span>{member.name}</span>
                            <small>{formatMoney(member.balance)}</small>
                          </label>
                        ))}
                    </div>

                    <button className="action-button" onClick={handleChargeExpense}>
                      Charge Expense
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {showBookingSection && (
            <section className="collapsible-section">
              <div className="collapsible-section-header">
                <div>
                  <h2>Booking Management</h2>
                  <p>Create sessions, manage bookings, and finalize charges.</p>
                </div>
              </div>

          <AdminBookingManagement
            bookingStatusOptions={bookingStatusOptions}
            formatMoney={formatMoney}
            getActiveSessionBookings={getActiveSessionBookings}
            getSessionBookings={getSessionBookings}
            getSessionChargeSummary={getSessionChargeSummary}
            handleCloseSession={handleCloseSession}
            handleCreateSession={handleCreateSession}
            handleFinalizeSessionCharge={handleFinalizeSessionCharge}
            handleOpenSession={handleOpenSession}
            handleBulkUpdateSessionBookingStatus={
              handleBulkUpdateSessionBookingStatus
            }
            handleUpdateBookingStatus={handleUpdateBookingStatus}
            handleUpdateSessionChargeField={handleUpdateSessionChargeField}
            members={members}
            newSessionCancelCutoff={newSessionCancelCutoff}
            newSessionCourtCount={newSessionCourtCount}
            newSessionCourtFeeTotal={newSessionCourtFeeTotal}
            newSessionDate={newSessionDate}
            newSessionMaxPlayers={newSessionMaxPlayers}
            newSessionTime={newSessionTime}
            newSessionVenue={newSessionVenue}
            sessions={sessions}
            setNewSessionCancelCutoff={setNewSessionCancelCutoff}
            setNewSessionCourtCount={setNewSessionCourtCount}
            setNewSessionCourtFeeTotal={setNewSessionCourtFeeTotal}
            setNewSessionDate={setNewSessionDate}
            setNewSessionMaxPlayers={setNewSessionMaxPlayers}
            setNewSessionTime={setNewSessionTime}
            setNewSessionVenue={setNewSessionVenue}
            users={users}
          />
            </section>
          )}

          {showTransactionsSection && (
            <section className="collapsible-section">
              <div className="collapsible-section-header">
                <div>
                  <h2>Transactions</h2>
                  <p>Search, filter, export, and review club transaction history.</p>
                </div>
              </div>

          <div className="panel transaction-panel">
            <div className="panel-header">
              <div>
                <h2>All Transactions</h2>
                <p>Search and filter club transaction history.</p>
              </div>

              <button className="secondary-button" onClick={handleExportTransactions}>
                Export CSV
              </button>
            </div>

            <div className="member-tools">
              <input
                type="text"
                placeholder="Search member or description..."
                value={transactionSearch}
                onChange={(event) => setTransactionSearch(event.target.value)}
              />

              <select
                value={transactionFilter}
                onChange={(event) => setTransactionFilter(event.target.value)}
              >
                <option value="all">All Transactions</option>
                <option value="reload">Reload Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="empty-text">No transactions yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.date}</td>
                      <td>{transaction.memberName}</td>
                      <td>{transaction.description}</td>
                      <td className={transaction.amount < 0 ? "negative" : "positive"}>
                        {formatMoney(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {filteredTransactions.length > adminTransactionPageSize && (
              <div className="pagination-controls">
                <button
                  className="pagination-button"
                  disabled={safeAdminTransactionPage === 1}
                  onClick={() =>
                    setAdminTransactionPage(safeAdminTransactionPage - 1)
                  }
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {safeAdminTransactionPage} of {adminTransactionTotalPages}
                </span>
                <button
                  className="pagination-button"
                  disabled={
                    safeAdminTransactionPage === adminTransactionTotalPages
                  }
                  onClick={() =>
                    setAdminTransactionPage(safeAdminTransactionPage + 1)
                  }
                >
                  Next
                </button>
              </div>
            )}
          </div>
            </section>
          )}

          {pendingRequests.length > 0 && (
          <div className="panel reload-request-panel">
            <h2>Pending Reload Requests</h2>

            {pendingRequests.length === 0 ? (
              <p className="empty-text">No reload request yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Screenshot</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedPendingRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.date}</td>
                      <td>{request.memberName}</td>
                      <td className="positive">{formatMoney(request.amount)}</td>
                      <td>
                        <a href={request.screenshotUrl} target="_blank" rel="noreferrer">
                          <img
                            src={request.screenshotUrl}
                            alt="Payment Screenshot"
                            className="payment-preview"
                          />
                        </a>
                      </td>
                      <td>{request.status}</td>
                      <td>
                        {request.status === "Pending" ? (
                          <div className="table-actions">
                            <button
                              className="small-approve-button"
                              onClick={() => handleApproveReload(request)}
                            >
                              Approve
                            </button>

                            <button
                              className="small-reject-button"
                              onClick={() => handleRejectReload(request.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {pendingRequests.length > adminPendingReloadPageSize && (
              <div className="pagination-controls">
                <button
                  className="pagination-button"
                  disabled={safeAdminPendingReloadPage === 1}
                  onClick={() =>
                    setAdminPendingReloadPage(safeAdminPendingReloadPage - 1)
                  }
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {safeAdminPendingReloadPage} of{" "}
                  {adminPendingReloadTotalPages}
                </span>
                <button
                  className="pagination-button"
                  disabled={
                    safeAdminPendingReloadPage === adminPendingReloadTotalPages
                  }
                  onClick={() =>
                    setAdminPendingReloadPage(safeAdminPendingReloadPage + 1)
                  }
                >
                  Next
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    );
  }

  if (page === "member") {
    return (
      <>
        {renderSupabaseLoadNotice()}
        <MemberPortal
          currentUser={currentUser}
          users={users}
          members={members}
          reloadRequests={reloadRequests}
          transactions={transactions}
          showTopUpBox={showTopUpBox}
          setShowTopUpBox={setShowTopUpBox}
          topUpAmount={topUpAmount}
          setTopUpAmount={setTopUpAmount}
          setPaymentScreenshot={setPaymentScreenshot}
          isSubmittingReloadRequest={isSubmittingReloadRequest}
          handleSubmitReloadRequest={handleSubmitReloadRequest}
          handleLogout={handleLogout}
          formatMoney={formatMoney}
          memberOldPassword={memberOldPassword}
          setMemberOldPassword={setMemberOldPassword}
          memberNewPassword={memberNewPassword}
          setMemberNewPassword={setMemberNewPassword}
          memberConfirmPassword={memberConfirmPassword}
          setMemberConfirmPassword={setMemberConfirmPassword}
          handleMemberChangePassword={handleMemberChangePassword}
          showMemberPasswordPanel={showMemberPasswordPanel}
          setShowMemberPasswordPanel={setShowMemberPasswordPanel}
          memberNewLoginId={memberNewLoginId}
          setMemberNewLoginId={setMemberNewLoginId}
          memberLoginIdPassword={memberLoginIdPassword}
          setMemberLoginIdPassword={setMemberLoginIdPassword}
          handleMemberChangeLoginId={handleMemberChangeLoginId}
          showMemberLoginIdPanel={showMemberLoginIdPanel}
          setShowMemberLoginIdPanel={setShowMemberLoginIdPanel}
          memberWhatsappInput={memberWhatsappInput}
          setMemberWhatsappInput={setMemberWhatsappInput}
          showWhatsappPrompt={showWhatsappPrompt}
          setShowWhatsappPrompt={setShowWhatsappPrompt}
          handleMemberUpdateWhatsapp={handleMemberUpdateWhatsapp}
          sessions={sessions}
          sessionBookings={sessionBookings}
          getActiveSessionBookings={getActiveSessionBookings}
          handleBookSession={handleBookSession}
          handleCancelSessionBooking={handleCancelSessionBooking}
          isPastCancelCutoff={isPastCancelCutoff}
          minimumBookingBalance={MINIMUM_BOOKING_BALANCE}
        />
      </>
    );
  }
  if (page === "register") {

    return (
      <>
        {renderSupabaseLoadNotice()}
        <div className="page">
          <div className="login-card">
            <div className="logo-box">BYT</div>

            <h1>New Member Register</h1>
            <p className="subtitle">
              For new members only. Existing members can login using the account ID provided by admin.
            </p>

            <div className="form">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
              />

              <label>Email / Login ID</label>
              <input
                type="text"
                placeholder="Enter email or login ID"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
              />

              <label>Password</label>
              <input
                type="password"
                placeholder="Create password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
              />

              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={registerConfirmPassword}
                onChange={(event) =>
                  setRegisterConfirmPassword(event.target.value)
                }
              />

              <button className="login-button" onClick={handleRegister}>
                Register New Member
              </button>

              <button
                className="register-link-button"
                onClick={() => {
                  setAuthNotice("");
                  setPage("login");
                }}
              >
                Back to Login
              </button>
            </div>

            <p className="footer-text">Prototype version · BYT Club Wallet</p>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      {renderSupabaseLoadNotice()}
      <LoginPage
        authNotice={authNotice}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleLogin={handleLogin}
        setPage={(nextPage) => {
          if (nextPage === "register") {
            setAuthNotice("");
          }
          setPage(nextPage);
        }}
      />
    </>
  );
}

export default App;
