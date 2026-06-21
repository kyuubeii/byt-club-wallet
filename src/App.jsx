import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Image,
  Paper,
  PasswordInput,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
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
import memberResetCsv from "./data/byt_june_2026_member_reset.csv?raw";

const MINIMUM_BOOKING_BALANCE = 15;
const USE_SUPABASE_DATA = true;
const APP_VERSION = "1.0.0";
const APP_ENVIRONMENT = import.meta.env.MODE;
const APP_DATA_MODE = USE_SUPABASE_DATA ? "Supabase Online" : "Local Cache";
const MEMBER_PACKAGES = {
  exclusive: {
    packageType: "exclusive",
    packageName: "BYT Exclusive Member",
    packagePrice: 128,
    packageCredit: 100,
    registrationFee: 28,
  },
  extreme: {
    packageType: "extreme",
    packageName: "BYT Extreme Member",
    packagePrice: 158,
    packageCredit: 100,
    registrationFee: 58,
  },
};
const GIFT_CHOICES = ["wristband", "headband"];
const UNIFORM_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const AI_IMPORT_EMPTY_SESSION_DRAFT = {
  title: "",
  venue: "",
  date: "",
  time: "",
  courtCount: "",
  courtNumbers: "",
  walkInLimit: "5",
  walkInFee: "",
  maxPlayers: "",
  courtFeeTotal: "",
  cancelCutoff: "12:00",
};
const AI_IMPORT_MAX_TEXT_LENGTH = 12000;

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

function normalizeAiImportName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toAiImportInputValue(value, fallbackValue = "") {
  if (value === null || value === undefined || value === 0) {
    return fallbackValue;
  }

  return String(value);
}

function createAiImportRowId(index, participant) {
  return `${index}-${normalizeAiImportName(
    participant.rawName || participant.memberName || "participant"
  )}`;
}

function buildAiImportParticipantPreview(parsedParticipants, members) {
  const activeMembers = members.filter((member) => member.status === "active");

  return (parsedParticipants || []).map((participant, index) => {
    const memberName = String(participant.memberName || "").trim();
    const normalizedMemberName = normalizeAiImportName(memberName);
    const exactMatches = activeMembers.filter(
      (member) => normalizeAiImportName(member.name) === normalizedMemberName
    );
    const candidates =
      exactMatches.length > 0
        ? exactMatches
        : activeMembers.filter((member) => {
            const normalizedActiveMemberName = normalizeAiImportName(member.name);

            return (
              normalizedMemberName !== "" &&
              (normalizedActiveMemberName.includes(normalizedMemberName) ||
                normalizedMemberName.includes(normalizedActiveMemberName))
            );
          });
    const matchStatus =
      candidates.length === 1
        ? "matched"
        : candidates.length > 1
          ? "ambiguous"
          : "unmatched";

    return {
      id: createAiImportRowId(index, participant),
      rawName: String(participant.rawName || memberName).trim(),
      memberName: memberName,
      walkInCount: Math.max(0, Number(participant.walkInCount || 0)),
      walkInNames: Array.isArray(participant.walkInNames)
        ? participant.walkInNames.map((name) => String(name || "").trim()).filter(Boolean)
        : [],
      matchStatus,
      matchedMemberId: candidates.length === 1 ? String(candidates[0].id) : "",
      candidates: candidates.map((member) => ({
        id: member.id,
        name: member.name,
      })),
    };
  });
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

function normalizeWhatsappForLink(value) {
  const trimmedValue = String(value || "").trim();

  if (trimmedValue === "") {
    return "";
  }

  let normalizedValue = trimmedValue.replace(/[\s\-()]/g, "");

  if (normalizedValue.startsWith("+")) {
    normalizedValue = normalizedValue.slice(1);
  }

  normalizedValue = normalizedValue.replace(/\D/g, "");

  if (normalizedValue.startsWith("0")) {
    normalizedValue = `60${normalizedValue.slice(1)}`;
  }

  return normalizedValue;
}

function getMemberRegistrationDefaults(member = {}) {
  return {
    packageType: member.packageType || "",
    packageName: member.packageName || "",
    packagePrice: Number(member.packagePrice || 0),
    packageCredit: Number(member.packageCredit || 0),
    registrationFee: Number(member.registrationFee || 0),
    giftChoice: member.giftChoice || "",
    uniformSize: member.uniformSize || "",
    gender: member.gender || "",
    birthday: member.birthday || "",
    emergencyContact: member.emergencyContact || "",
    registrationPaymentProofName: member.registrationPaymentProofName || "",
    registrationPaymentProofUrl: member.registrationPaymentProofUrl || "",
    agreedTerms: Boolean(member.agreedTerms),
  };
}

function parseCsvLine(line) {
  const values = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && nextCharacter === "\"") {
      currentValue += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (character === "," && !isInsideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values.map((value) => value.trim());
}

function parseMemberResetCsv(csvText) {
  const lines = String(csvText || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = headers.reduce((rowData, header, index) => {
      rowData[header] = values[index] || "";
      return rowData;
    }, {});
    const memberId = Number(row.member_no);

    if (!memberId || Number.isNaN(memberId)) {
      throw new Error(`Invalid member_no in CSV row: ${line}`);
    }

    const memberName = row.name.trim();
    const loginId = row.default_login_id.trim();
    const defaultPassword = row.default_password.trim() || "123456";
    const balance = Number(row.balance_cf || 0);

    return {
      member: {
        id: memberId,
        name: memberName,
        balance: Number.isNaN(balance) ? 0 : balance,
        status: "active",
        memberType: "existing",
        email: loginId,
        whatsapp: "",
        ...getMemberRegistrationDefaults(),
      },
      user: {
        id: memberId,
        memberId,
        name: memberName,
        email: loginId,
        password: defaultPassword,
        role: "member",
      },
    };
  });
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
    walkInLimit: 5,
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
const initialSessionWalkins = [];

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
  sessionWalkins: "byt_sessionWalkins",
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

function safeParseDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const dateText = String(dateValue).trim();
  const slashDateMatch = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashDateMatch) {
    const [, day, month, year] = slashDateMatch;
    const parsedSlashDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    if (!Number.isNaN(parsedSlashDate.getTime())) {
      return parsedSlashDate;
    }
  }

  const parsedDate = new Date(dateText);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function getDateInputValue(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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
    memberType:
      member.member_type === "regular" ? "existing" : member.member_type || null,
    whatsapp: member.whatsapp || "",
    ...getMemberRegistrationDefaults({
      packageType: member.package_type,
      packageName: member.package_name,
      packagePrice: member.package_price,
      packageCredit: member.package_credit,
      registrationFee: member.registration_fee,
      giftChoice: member.gift_choice,
      uniformSize: member.uniform_size,
      gender: member.gender,
      birthday: member.birthday,
      emergencyContact: member.emergency_contact,
      registrationPaymentProofName: member.registration_payment_proof_name,
      registrationPaymentProofUrl: member.registration_payment_proof_url,
      agreedTerms: member.agreed_terms,
    }),
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
    walkInLimit: Number(session.walk_in_limit ?? 5),
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
    walkInCount: Number(booking.walk_in_count || 0),
    walkInNames: booking.walk_in_names || [],
    lateCancelledWalkInCount: Number(
      booking.late_cancelled_walk_in_count || 0
    ),
    lateCancelledWalkInNames: booking.late_cancelled_walk_in_names || [],
    waitlistType: booking.waitlist_type || null,
    waitlistStatus: booking.waitlist_status || null,
  }));
}

function convertSupabaseSessionWalkins(supabaseWalkins) {
  return supabaseWalkins.map((walkin) => ({
    id: walkin.id,
    sessionId: walkin.session_id,
    name: walkin.name || "",
    status: walkin.status || "confirmed",
    createdAt: walkin.created_at || "",
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
  const [registerPackageType, setRegisterPackageType] = useState("");
  const [registerGiftChoice, setRegisterGiftChoice] = useState("");
  const [registerUniformSize, setRegisterUniformSize] = useState("");
  const [registerGender, setRegisterGender] = useState("");
  const [registerBirthday, setRegisterBirthday] = useState("");
  const [registerWhatsapp, setRegisterWhatsapp] = useState("");
  const [registerEmergencyContact, setRegisterEmergencyContact] = useState("");
  const [registerAgreedTerms, setRegisterAgreedTerms] = useState(false);
  const [registerPaymentProof, setRegisterPaymentProof] = useState(null);
  const [isSubmittingRegistration, setIsSubmittingRegistration] =
    useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState(3);
  const [manualBalance, setManualBalance] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [selectedExpenseMembers, setSelectedExpenseMembers] = useState([]);
  const [weeklyReportDate, setWeeklyReportDate] = useState(() =>
    getDateInputValue()
  );
  const [isExportingWeeklyReportPdf, setIsExportingWeeklyReportPdf] =
    useState(false);
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
  const [showSmartToolsSection, setShowSmartToolsSection] = useState(false);
  const [showTransactionsSection, setShowTransactionsSection] = useState(false);
  const [showActivitySection, setShowActivitySection] = useState(false);
  const [showPaymentReminderSection, setShowPaymentReminderSection] =
    useState(false);
  const [showAnalyticsSection, setShowAnalyticsSection] = useState(false);
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
  const [sessionWalkins, setSessionWalkins] = useState(() =>
    loadFromStorage(STORAGE_KEYS.sessionWalkins, initialSessionWalkins)
  );

  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionTime, setNewSessionTime] = useState("");
  const [newSessionVenue, setNewSessionVenue] = useState("");
  const [newSessionCourtCount, setNewSessionCourtCount] = useState("");
  const [newSessionMaxPlayers, setNewSessionMaxPlayers] = useState("");
  const [newSessionCourtFeeTotal, setNewSessionCourtFeeTotal] = useState("");
  const [newSessionCancelCutoff, setNewSessionCancelCutoff] = useState("12:00");
  const [newSessionWalkInLimit, setNewSessionWalkInLimit] = useState("5");
  const [walkInSelections, setWalkInSelections] = useState({});
  const [aiImportText, setAiImportText] = useState("");
  const [aiImportIsParsing, setAiImportIsParsing] = useState(false);
  const [aiImportError, setAiImportError] = useState("");
  const [aiImportPreview, setAiImportPreview] = useState(null);
  const [aiImportResolutions, setAiImportResolutions] = useState({});
  const [aiImportSessionDraft, setAiImportSessionDraft] = useState(
    AI_IMPORT_EMPTY_SESSION_DRAFT
  );
  const [aiImportIsConfirming, setAiImportIsConfirming] = useState(false);
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
    saveToStorage(STORAGE_KEYS.sessionWalkins, sessionWalkins);
  }, [sessionWalkins]);

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
        fetchSessionWalkinsFromSupabase,
        fetchTransactionsFromSupabase,
        fetchReloadRequestsFromSupabase,
      } = await import("./services/supabaseServices.js");

      const [
        supabaseMembers,
        supabaseUsers,
        supabaseSessions,
        supabaseBookings,
        supabaseWalkins,
        supabaseTransactions,
        supabaseReloadRequests,
      ] = await Promise.all([
        fetchMembersFromSupabase(),
        fetchUsersFromSupabase(),
        fetchSessionsFromSupabase(),
        fetchSessionBookingsFromSupabase(),
        fetchSessionWalkinsFromSupabase(),
        fetchTransactionsFromSupabase(),
        fetchReloadRequestsFromSupabase(),
      ]);

      setMembers(convertSupabaseMembers(supabaseMembers));
      setUsers(convertSupabaseUsers(supabaseUsers));
      setSessions(convertSupabaseSessions(supabaseSessions));
      setSessionBookings(convertSupabaseSessionBookings(supabaseBookings));
      setSessionWalkins(convertSupabaseSessionWalkins(supabaseWalkins));
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
  function clearRegistrationForm() {
    setRegisterName("");
    setRegisterPackageType("");
    setRegisterGiftChoice("");
    setRegisterUniformSize("");
    setRegisterGender("");
    setRegisterBirthday("");
    setRegisterWhatsapp("");
    setRegisterEmergencyContact("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterConfirmPassword("");
    setRegisterAgreedTerms(false);
    setRegisterPaymentProof(null);
  }

  async function handleRegister() {
    if (isSubmittingRegistration) {
      return;
    }

    const selectedPackage = MEMBER_PACKAGES[registerPackageType];

    if (!selectedPackage) {
      alert("Please select a member package");
      return;
    }

    if (registerGiftChoice.trim() === "") {
      alert("Please choose your gift");
      return;
    }

    if (registerName.trim() === "") {
      alert("Please enter your full name");
      return;
    }

    if (registerGender.trim() === "") {
      alert("Please select your gender");
      return;
    }

    if (registerBirthday.trim() === "") {
      alert("Please enter your birthday");
      return;
    }

    const normalizedWhatsapp = normalizeWhatsappNumber(registerWhatsapp);

    if (!normalizedWhatsapp) {
      alert("Please enter a valid WhatsApp / mobile number");
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

    if (registerEmergencyContact.trim() === "") {
      alert("Please enter emergency contact name and number");
      return;
    }

    if (
      selectedPackage.packageType === "extreme" &&
      registerUniformSize.trim() === ""
    ) {
      alert("Please select your uniform size");
      return;
    }

    if (!registerAgreedTerms) {
      alert("Please agree to BYT Club Terms & Conditions");
      return;
    }

    if (!registerPaymentProof) {
      alert("Please upload payment proof");
      return;
    }

    const normalizedRegisterEmail = registerEmail.trim();
    const emailExistsInMembers = members.some(
      (member) =>
        (member.email || "").toLowerCase() ===
        normalizedRegisterEmail.toLowerCase()
    );

    const emailExistsInUsers = users.some(
      (user) => user.email.toLowerCase() === normalizedRegisterEmail.toLowerCase()
    );

    if (emailExistsInMembers || emailExistsInUsers) {
      alert("This email is already registered");
      return;
    }

    const newId = Date.now();
    setIsSubmittingRegistration(true);

    let uploadedProof;

    try {
      uploadedProof = await uploadRegistrationProof(registerPaymentProof, newId);
    } catch (error) {
      console.error("Registration payment proof upload failed:", error);
      alert("Failed to upload registration payment proof. Please try again.");
      setIsSubmittingRegistration(false);
      return;
    }

    const newMember = {
      id: newId,
      name: registerName.trim(),
      email: normalizedRegisterEmail,
      whatsapp: normalizedWhatsapp,
      balance: 0,
      status: "pending",
      memberType: "new",
      packageType: selectedPackage.packageType,
      packageName: selectedPackage.packageName,
      packagePrice: selectedPackage.packagePrice,
      packageCredit: selectedPackage.packageCredit,
      registrationFee: selectedPackage.registrationFee,
      giftChoice: registerGiftChoice,
      uniformSize:
        selectedPackage.packageType === "extreme" ? registerUniformSize : "",
      gender: registerGender,
      birthday: registerBirthday,
      emergencyContact: registerEmergencyContact.trim(),
      registrationPaymentProofName: uploadedProof.proofName,
      registrationPaymentProofUrl: uploadedProof.proofUrl,
      agreedTerms: true,
    };

    const newUser = {
      id: newId,
      memberId: newId,
      name: registerName.trim(),
      email: normalizedRegisterEmail,
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
    } finally {
      setIsSubmittingRegistration(false);
    }

    alert(registrationMessage);
    setAuthNotice(registrationMessage);
    clearRegistrationForm();
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

  async function syncSessionWalkinToSupabase(walkin) {
    const { upsertSessionWalkinToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await upsertSessionWalkinToSupabase(walkin);
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

  async function syncSessionBookingDeleteToSupabase(bookingId) {
    const { deleteSessionBookingFromSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await deleteSessionBookingFromSupabase(bookingId);
  }

  async function syncSessionWalkinUpdateToSupabase(walkinId, updates) {
    const { updateSessionWalkinInSupabase } = await import(
      "./services/supabaseServices.js"
    );

    await updateSessionWalkinInSupabase(walkinId, updates);
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

  async function uploadRegistrationProof(file, memberId) {
    const { uploadRegistrationProofToSupabase } = await import(
      "./services/supabaseServices.js"
    );

    return uploadRegistrationProofToSupabase(file, memberId);
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

  function alertSupabaseWalkinSyncFailed(error) {
    console.error("Supabase walk-in sync failed:", error);
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
      ...getMemberRegistrationDefaults(),
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
      balance:
        Number(pendingMember.packageCredit || 0) > 0
          ? Number(pendingMember.packageCredit)
          : Number(pendingMember.balance || 0),
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
      setEditMemberBalance(updatedMember.balance);
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
      description: pendingMember.packageName
        ? `Approved member ${pendingMember.name} - ${pendingMember.packageName} RM${Number(pendingMember.packagePrice || 0)}`
        : `Approved member ${pendingMember.name}`,
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
    const resetSessionWalkins = initialSessionWalkins;

    setUsers(resetUsers);
    setMembers(resetMembers);
    setReloadRequests(resetReloadRequests);
    setTransactions(resetTransactions);
    setSessions(resetSessions);
    setSessionBookings(resetSessionBookings);
    setSessionWalkins(resetSessionWalkins);
    saveToStorage(STORAGE_KEYS.users, resetUsers);
    saveToStorage(STORAGE_KEYS.members, resetMembers);
    saveToStorage(STORAGE_KEYS.reloadRequests, resetReloadRequests);
    saveToStorage(STORAGE_KEYS.transactions, resetTransactions);
    saveToStorage(STORAGE_KEYS.sessions, resetSessions);
    saveToStorage(STORAGE_KEYS.sessionBookings, resetSessionBookings);
    saveToStorage(STORAGE_KEYS.sessionWalkins, resetSessionWalkins);
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

  async function handleResetProductionMembersJune2026() {
    if (currentUser?.role !== "admin") {
      alert("Admin access required.");
      return;
    }

    const confirmReset = prompt(
      "Type RESET PRODUCTION DATA to confirm production data reset."
    );

    if (confirmReset !== "RESET PRODUCTION DATA") {
      alert("Reset cancelled.");
      return;
    }

    let resetRows;

    try {
      resetRows = parseMemberResetCsv(memberResetCsv);
    } catch (error) {
      console.error("Failed to parse production member reset CSV:", error);
      alert(`Failed to parse member reset CSV: ${getFriendlyErrorMessage(error)}`);
      return;
    }

    const resetMembers = resetRows.map((row) => row.member);
    const resetMemberUsers = resetRows.map((row) => row.user);
    const preservedAdminUsers = users.filter((user) => user.role === "admin");
    const resetUsers = [...preservedAdminUsers, ...resetMemberUsers];

    setMembers(resetMembers);
    setUsers(resetUsers);
    setTransactions([]);
    setReloadRequests([]);
    setSessions([]);
    setSessionBookings([]);
    setSessionWalkins([]);
    setActivityLogs([]);
    saveToStorage(STORAGE_KEYS.members, resetMembers);
    saveToStorage(STORAGE_KEYS.users, resetUsers);
    saveToStorage(STORAGE_KEYS.transactions, []);
    saveToStorage(STORAGE_KEYS.reloadRequests, []);
    saveToStorage(STORAGE_KEYS.sessions, []);
    saveToStorage(STORAGE_KEYS.sessionBookings, []);
    saveToStorage(STORAGE_KEYS.sessionWalkins, []);

    try {
      const {
        clearSupabaseMembers,
        clearSupabaseMemberUsers,
        clearSupabaseTransactions,
        clearSupabaseReloadRequests,
        clearSupabaseSessionBookings,
        clearSupabaseSessionWalkins,
        clearSupabaseActivityLogs,
        clearSupabaseSessions,
        seedMembersToSupabase,
        seedUsersToSupabase,
      } = await import("./services/supabaseServices.js");

      await clearSupabaseSessionWalkins();
      await clearSupabaseSessionBookings();
      await clearSupabaseTransactions();
      await clearSupabaseReloadRequests();
      await clearSupabaseActivityLogs();
      await clearSupabaseMemberUsers();
      await clearSupabaseSessions();
      await clearSupabaseMembers();
      await seedMembersToSupabase(resetMembers);
      await seedUsersToSupabase(resetMemberUsers);
      await loadAllDataFromSupabase();

      alert(
        `Production data reset completed. Imported ${resetMembers.length} members. Admin account preserved.`
      );
    } catch (error) {
      console.error("Production data reset failed:", error);
      alert(`Production data reset failed: ${getFriendlyErrorMessage(error)}`);
    }
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

  async function handleExportWeeklyReportPdf() {
    if (!weeklyReportDate) {
      alert("Please select a report date");
      return;
    }

    if (isExportingWeeklyReportPdf) {
      return;
    }

    setIsExportingWeeklyReportPdf(true);

    try {
      const { exportWeeklyReportPdf } = await import(
        "./utils/exportWeeklyReportPdf.js"
      );

      await exportWeeklyReportPdf({
        members,
        transactions,
        reportDate: weeklyReportDate,
        logoUrl: "/byt-logo.jpeg",
        qrUrl: "/duitnow-qr.png",
      });
    } catch (error) {
      console.error("Failed to export weekly report PDF:", error);
      alert(`Failed to export weekly report PDF: ${getFriendlyErrorMessage(error)}`);
    } finally {
      setIsExportingWeeklyReportPdf(false);
    }
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

  function getPaymentReminderMessage(member) {
    const formattedBalance = formatMoney(Number(member.balance || 0));

    if (Number(member.balance || 0) < 0) {
      return `Hi ${member.name}, your BYT Club Wallet balance is ${formattedBalance}. Kindly reload your wallet to clear the outstanding balance before the next session. Thank you.`;
    }

    return `Hi ${member.name}, your BYT Club Wallet balance is ${formattedBalance}. Please reload before booking or joining the next session. Thank you.`;
  }

  async function handleCopyPaymentReminder(member) {
    const message = getPaymentReminderMessage(member);

    try {
      await navigator.clipboard.writeText(message);
      alert("Reminder message copied.");
      logActivity({
        action: "copy_payment_reminder",
        targetType: "member",
        targetId: String(member.id),
        description: `Copied payment reminder for ${member.name}`,
      });
    } catch (error) {
      console.error("Unable to copy payment reminder:", error);
      alert("Unable to copy message. Please copy manually.");
    }
  }

  function handleOpenWhatsappReminder(member) {
    const phone = normalizeWhatsappForLink(member.whatsapp);

    if (!phone) {
      alert(
        "This member does not have a WhatsApp number. Please update member profile first."
      );
      return;
    }

    const message = getPaymentReminderMessage(member);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    logActivity({
      action: "open_whatsapp_payment_reminder",
      targetType: "member",
      targetId: String(member.id),
      description: `Opened WhatsApp payment reminder for ${member.name}`,
    });
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

  function getAiImportActiveMembers() {
    return members.filter((member) => member.status === "active");
  }

  function getAiImportResolvedMemberId(row) {
    return String(aiImportResolutions[row.id] || row.matchedMemberId || "");
  }

  function getAiImportResolvedRows() {
    if (!aiImportPreview) {
      return [];
    }

    return aiImportPreview.participants
      .map((row) => ({
        ...row,
        resolvedMemberId: getAiImportResolvedMemberId(row),
      }))
      .filter((row) => row.resolvedMemberId !== "");
  }

  function getAiImportConfirmIssues() {
    if (!aiImportPreview) {
      return ["Parse a session list first."];
    }

    const issues = [];
    const maxPlayers = Number(aiImportSessionDraft.maxPlayers || 0);
    const courtFeeTotal = Number(aiImportSessionDraft.courtFeeTotal || 0);
    const courtCount = Number(aiImportSessionDraft.courtCount || 0);
    const walkInLimit = Number(aiImportSessionDraft.walkInLimit || 0);
    const resolvedRows = getAiImportResolvedRows();
    const resolvedMemberIds = resolvedRows.map((row) => row.resolvedMemberId);
    const duplicateMemberIds = resolvedMemberIds.filter(
      (memberId, index) => resolvedMemberIds.indexOf(memberId) !== index
    );
    const memberAttachedWalkInCount = resolvedRows.reduce(
      (total, row) => total + Number(row.walkInCount || 0),
      0
    );
    const confirmedIndependentWalkInCount =
      aiImportPreview.independentWalkins.filter(
        (walkin) => walkin.status === "confirmed"
      ).length;
    const totalParticipantCount =
      resolvedRows.length +
      memberAttachedWalkInCount +
      confirmedIndependentWalkInCount;
    const totalWalkInCount =
      memberAttachedWalkInCount + confirmedIndependentWalkInCount;

    if (!aiImportSessionDraft.date) {
      issues.push("Session date is required.");
    }

    if (!aiImportSessionDraft.time.trim()) {
      issues.push("Session time is required.");
    }

    if (!aiImportSessionDraft.venue.trim()) {
      issues.push("Venue is required.");
    }

    if (courtCount <= 0) {
      issues.push("Court count must be greater than 0.");
    }

    if (maxPlayers <= 0) {
      issues.push("Max players must be greater than 0.");
    }

    if (courtFeeTotal <= 0) {
      issues.push("Enter court fee total before import.");
    }

    if (walkInLimit < 0) {
      issues.push("Walk-in limit cannot be negative.");
    }

    if (walkInLimit > maxPlayers && maxPlayers > 0) {
      issues.push("Walk-in limit cannot exceed max players.");
    }

    if (duplicateMemberIds.length > 0) {
      issues.push("Duplicate resolved members must be skipped or resolved.");
    }

    if (totalParticipantCount > maxPlayers && maxPlayers > 0) {
      issues.push("Resolved participants exceed max players.");
    }

    if (totalWalkInCount > walkInLimit) {
      issues.push("Resolved walk-ins exceed walk-in limit.");
    }

    if (
      resolvedRows.length === 0 &&
      aiImportPreview.independentWalkins.length === 0
    ) {
      issues.push("Resolve at least one member or independent walk-in.");
    }

    return issues;
  }

  function handleAiImportSessionDraftChange(field, value) {
    setAiImportSessionDraft((previousDraft) => ({
      ...previousDraft,
      [field]: value,
    }));
  }

  function handleAiImportResolutionChange(rowId, memberId) {
    setAiImportResolutions((previousResolutions) => ({
      ...previousResolutions,
      [rowId]: memberId,
    }));
  }

  async function handleParseAiSessionList() {
    const text = aiImportText.trim();

    if (!text) {
      setAiImportError("Please paste a session list first.");
      return;
    }

    if (text.length > AI_IMPORT_MAX_TEXT_LENGTH) {
      setAiImportError("Session list is too long.");
      return;
    }

    setAiImportIsParsing(true);
    setAiImportError("");

    try {
      const response = await fetch("/api/parse-session-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const parserError = payload.details
          ? `${payload.error || "Unable to parse session list"}: ${payload.details}`
          : payload.error || "Unable to parse session list.";

        throw new Error(parserError);
      }

      const parsedMemberCandidates = Array.isArray(payload.memberCandidates)
        ? payload.memberCandidates
        : Array.isArray(payload.participants)
          ? payload.participants
          : [];
      const parsedWalkins = Array.isArray(payload.walkins)
        ? payload.walkins
        : Array.isArray(payload.independentWalkins)
          ? payload.independentWalkins
          : [];
      const participants = buildAiImportParticipantPreview(
        parsedMemberCandidates,
        members
      );
      const sessionDraft = payload.sessionDraft || {};
      const confirmedWalkinCount = parsedWalkins.filter(
        (walkin) => walkin.status !== "waiting"
      ).length;
      const fallbackMaxPlayers = participants.reduce(
        (total, participant) =>
          total + 1 + Number(participant.walkInCount || 0),
        confirmedWalkinCount
      );

      setAiImportPreview({
        sessionDraft,
        participants,
        independentWalkins: parsedWalkins,
        warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
      });
      setAiImportSessionDraft({
        title: sessionDraft.title || "",
        venue: sessionDraft.venue || "",
        date: sessionDraft.date || "",
        time: sessionDraft.time || "",
        courtCount: toAiImportInputValue(sessionDraft.courtCount),
        courtNumbers: sessionDraft.courtNumbers || "",
        walkInLimit: toAiImportInputValue(sessionDraft.walkInLimit, "5"),
        walkInFee: toAiImportInputValue(sessionDraft.walkInFee),
        maxPlayers: toAiImportInputValue(
          sessionDraft.maxPlayers,
          fallbackMaxPlayers > 0 ? String(fallbackMaxPlayers) : ""
        ),
        courtFeeTotal: "",
        cancelCutoff: "12:00",
      });
      setAiImportResolutions({});
    } catch (error) {
      console.error("AI import parse failed:", error);
      setAiImportError(getFriendlyErrorMessage(error));
      setAiImportPreview(null);
      setAiImportResolutions({});
    } finally {
      setAiImportIsParsing(false);
    }
  }

  async function handleConfirmAiSessionImport() {
    const issues = getAiImportConfirmIssues();

    if (issues.length > 0) {
      alert(issues[0]);
      return;
    }

    if (aiImportIsConfirming) {
      return;
    }

    setAiImportIsConfirming(true);

    try {
      const resolvedRows = getAiImportResolvedRows();
      const importedAt = new Date().toLocaleString();
      const idBase = Date.now();
      const newSession = {
        id: idBase,
        date: aiImportSessionDraft.date,
        time: aiImportSessionDraft.time.trim(),
        venue: aiImportSessionDraft.venue.trim(),
        courtCount: Number(aiImportSessionDraft.courtCount || 0),
        maxPlayers: Number(aiImportSessionDraft.maxPlayers || 0),
        walkInLimit: Number(aiImportSessionDraft.walkInLimit || 0),
        courtFeeTotal: Number(aiImportSessionDraft.courtFeeTotal || 0),
        cancelCutoff: normalizeCutoffTime(
          aiImportSessionDraft.cancelCutoff || "12:00"
        ),
        status: "open",
        chargeStatus: "not_charged",
        shuttlecockUsed: 0,
        shuttlecockRate: 11,
        otherFeeTotal: 0,
        importTitle: aiImportSessionDraft.title.trim(),
        courtNumbers: aiImportSessionDraft.courtNumbers.trim(),
        walkInFee: Number(aiImportSessionDraft.walkInFee || 0),
      };
      const newBookings = resolvedRows.map((row, index) => ({
        id: idBase + index + 1,
        sessionId: newSession.id,
        memberId: Number(row.resolvedMemberId),
        status: "booked",
        bookedAt: importedAt,
        cancelledAt: null,
        statusUpdatedAt: null,
        walkInCount: Number(row.walkInCount || 0),
        walkInNames: row.walkInNames || [],
        lateCancelledWalkInCount: 0,
        lateCancelledWalkInNames: [],
        waitlistType: null,
        waitlistStatus: null,
      }));
      const newWalkins = (aiImportPreview.independentWalkins || []).map(
        (walkin, index) => ({
          id: idBase + 1000 + index,
          sessionId: newSession.id,
          name: String(walkin.name || "").trim(),
          status: walkin.status === "waiting" ? "waiting" : "confirmed",
          createdAt: importedAt,
        })
      );

      setSessions((previousSessions) => [newSession, ...previousSessions]);
      setSessionBookings((previousBookings) => [
        ...newBookings,
        ...previousBookings,
      ]);
      setSessionWalkins((previousWalkins) => [
        ...newWalkins,
        ...previousWalkins,
      ]);

      try {
        await Promise.all([
          syncSessionToSupabase(newSession),
          ...newBookings.map((booking) => syncSessionBookingToSupabase(booking)),
          ...newWalkins.map((walkin) => syncSessionWalkinToSupabase(walkin)),
        ]);
      } catch (error) {
        alertSupabaseBookingSyncFailed(error);
        return;
      }

      logActivity({
        action: "ai_import_session",
        targetType: "session",
        targetId: String(newSession.id),
        description: `Imported session ${newSession.date} from AI parser with ${newBookings.length} member booking(s) and ${newWalkins.length} independent walk-in(s)`,
      });

      setAiImportText("");
      setAiImportPreview(null);
      setAiImportResolutions({});
      setAiImportSessionDraft(AI_IMPORT_EMPTY_SESSION_DRAFT);
      alert("AI session import completed.");
    } finally {
      setAiImportIsConfirming(false);
    }
  }

  function getSessionBookings(sessionId) {
    return sessionBookings.filter(
      (booking) => Number(booking.sessionId) === Number(sessionId)
    );
  }

  function isConfirmedSessionBooking(booking) {
    return (
      booking.status !== "cancelled" &&
      booking.waitlistStatus !== "waiting" &&
      booking.waitlistStatus !== "removed"
    );
  }

  function getSessionConfirmedBookings(sessionId) {
    return sessionBookings.filter(
      (booking) =>
        Number(booking.sessionId) === Number(sessionId) &&
        isConfirmedSessionBooking(booking)
    );
  }

  function getActiveSessionBookings(sessionId) {
    return getSessionConfirmedBookings(sessionId);
  }

  function getSessionMemberBookingCount(sessionId) {
    return getSessionConfirmedBookings(sessionId).length;
  }

  function getSessionMemberAttachedWalkInCount(sessionId) {
    return getSessionConfirmedBookings(sessionId).reduce(
      (total, booking) => total + Number(booking.walkInCount || 0),
      0
    );
  }

  function getSessionIndependentWalkins(sessionId) {
    return sessionWalkins.filter(
      (walkin) => Number(walkin.sessionId) === Number(sessionId)
    );
  }

  function getSessionConfirmedIndependentWalkins(sessionId) {
    return getSessionIndependentWalkins(sessionId).filter(
      (walkin) => walkin.status === "confirmed"
    );
  }

  function getSessionWaitingIndependentWalkins(sessionId) {
    return getSessionIndependentWalkins(sessionId).filter(
      (walkin) => walkin.status === "waiting"
    );
  }

  function getSessionConfirmedIndependentWalkinCount(sessionId) {
    return getSessionConfirmedIndependentWalkins(sessionId).length;
  }

  function getSessionAllConfirmedWalkInCount(sessionId) {
    return (
      getSessionMemberAttachedWalkInCount(sessionId) +
      getSessionConfirmedIndependentWalkinCount(sessionId)
    );
  }

  function getSessionWalkInCount(sessionId) {
    return getSessionAllConfirmedWalkInCount(sessionId);
  }

  function getSessionTotalParticipantCount(sessionId) {
    return (
      getSessionMemberBookingCount(sessionId) +
      getSessionAllConfirmedWalkInCount(sessionId)
    );
  }

  function getSessionRemainingParticipantSlots(sessionId) {
    const session = sessions.find((session) => Number(session.id) === Number(sessionId));

    if (!session) {
      return 0;
    }

    return Math.max(
      0,
      Number(session.maxPlayers || 0) - getSessionTotalParticipantCount(sessionId)
    );
  }

  function getSessionRemainingWalkInSlots(sessionId) {
    const session = sessions.find((session) => Number(session.id) === Number(sessionId));

    if (!session) {
      return 0;
    }

    const remainingWalkInLimit =
      Number(session.walkInLimit ?? 5) - getSessionWalkInCount(sessionId);
    const remainingTotalSlots = getSessionRemainingParticipantSlots(sessionId);

    return Math.max(0, Math.min(remainingWalkInLimit, remainingTotalSlots));
  }

  function getSessionMemberWaitlist(sessionId) {
    return sessionBookings.filter(
      (booking) =>
        Number(booking.sessionId) === Number(sessionId) &&
        booking.waitlistType === "member" &&
        booking.waitlistStatus === "waiting"
    );
  }

  function getSessionWalkInWaitlist(sessionId) {
    return sessionBookings.filter(
      (booking) =>
        Number(booking.sessionId) === Number(sessionId) &&
        booking.waitlistType === "walkin" &&
        booking.waitlistStatus === "waiting"
    );
  }

  function getSessionShuttlecockFee(session) {
    return Number(session.shuttlecockUsed || 0) * Number(session.shuttlecockRate || 0);
  }

  function getSessionChargeSummary(session, bookings) {
    const confirmedBookings = bookings.filter((booking) =>
      isConfirmedSessionBooking(booking)
    );

    const courtBookings = confirmedBookings.filter((booking) =>
      courtChargeStatuses.includes(booking.status)
    );
    const courtBookingWalkInCount = courtBookings.reduce(
      (total, booking) => total + Number(booking.walkInCount || 0),
      0
    );
    const confirmedIndependentWalkInCount =
      getSessionConfirmedIndependentWalkinCount(session.id);
    const totalConfirmedWalkInCount =
      getSessionAllConfirmedWalkInCount(session.id);
    const courtDenominator =
      courtBookings.length +
      courtBookingWalkInCount +
      confirmedIndependentWalkInCount;

    const attendedBookings = confirmedBookings.filter(
      (booking) => booking.status === "attended"
    );
    const confirmedMemberAttachedWalkInCount = confirmedBookings.reduce(
      (total, booking) => total + Number(booking.walkInCount || 0),
      0
    );
    const shuttlecockDenominator =
      attendedBookings.length +
      confirmedMemberAttachedWalkInCount +
      confirmedIndependentWalkInCount;

    const courtFeeTotal = Number(session.courtFeeTotal || 0);
    const shuttlecockFeeTotal = getSessionShuttlecockFee(session);
    const otherFeeTotal = Number(session.otherFeeTotal || 0);
    const attendedFeeTotal = shuttlecockFeeTotal + otherFeeTotal;
    const courtFeePerPlayer =
      courtDenominator > 0 ? courtFeeTotal / courtDenominator : 0;
    const shuttlecockFeePerPlayer =
      shuttlecockDenominator > 0
        ? shuttlecockFeeTotal / shuttlecockDenominator
        : 0;
    const otherFeePerAttendedPlayer =
      attendedBookings.length > 0
        ? otherFeeTotal / attendedBookings.length
        : 0;
    const attendedFeePerPlayer =
      shuttlecockFeePerPlayer + otherFeePerAttendedPlayer;

    const chargeRows = confirmedBookings
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
      courtBookingWalkInCount: courtBookingWalkInCount,
      confirmedMemberAttachedWalkInCount: confirmedMemberAttachedWalkInCount,
      confirmedIndependentWalkInCount: confirmedIndependentWalkInCount,
      totalConfirmedWalkInCount: totalConfirmedWalkInCount,
      courtDenominator: courtDenominator,
      shuttlecockDenominator: shuttlecockDenominator,
      courtFeeTotal: courtFeeTotal,
      shuttlecockFeeTotal: shuttlecockFeeTotal,
      otherFeeTotal: otherFeeTotal,
      attendedFeeTotal: attendedFeeTotal,
      shuttlecockFeePerPlayer: shuttlecockFeePerPlayer,
      otherFeePerAttendedPlayer: otherFeePerAttendedPlayer,
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

    const walkInLimit =
      newSessionWalkInLimit === "" ? 5 : Number(newSessionWalkInLimit);

    if (walkInLimit < 0 || Number.isNaN(walkInLimit)) {
      alert("Please enter valid walk-in limit");
      return;
    }

    if (walkInLimit > Number(newSessionMaxPlayers)) {
      alert("Walk-in limit cannot exceed max players.");
      return;
    }

    const newSession = {
      id: Date.now(),
      date: newSessionDate,
      time: newSessionTime,
      venue: newSessionVenue,
      courtCount: Number(newSessionCourtCount),
      maxPlayers: Number(newSessionMaxPlayers),
      walkInLimit: walkInLimit,
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
    setNewSessionWalkInLimit("5");

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

    const alreadyBooked = sessionBookings.some(
      (booking) =>
        Number(booking.sessionId) === Number(sessionId) &&
        Number(booking.memberId) === Number(currentUser.memberId) &&
        booking.status !== "cancelled" &&
        booking.waitlistStatus !== "removed"
    );

    if (alreadyBooked) {
      alert("You already have a booking or waiting list request for this session.");
      return;
    }

    const selection = walkInSelections[sessionId] || {};
    const selectedWalkInCount = selection.bringWalkIn
      ? Math.min(5, Math.max(1, Number(selection.count || 1)))
      : 0;
    const walkInNames = selection.bringWalkIn
      ? (selection.names || [])
          .slice(0, selectedWalkInCount)
          .map((name) => String(name || "").trim())
      : [];

    if (
      selectedWalkInCount > 0 &&
      (walkInNames.length !== selectedWalkInCount ||
        walkInNames.some((name) => name === ""))
    ) {
      alert("Please enter all walk-in guest names");
      return;
    }

    const existingMembers = getSessionMemberBookingCount(sessionId);
    const existingWalkIns = getSessionWalkInCount(sessionId);
    const existingTotal = existingMembers + existingWalkIns;
    const newTotal = existingTotal + 1 + selectedWalkInCount;
    const walkInLimit = Number(session.walkInLimit ?? 5);
    const canConfirmBooking =
      newTotal <= Number(session.maxPlayers || 0) &&
      existingWalkIns + selectedWalkInCount <= walkInLimit;

    let waitlistType = null;
    let waitlistStatus = null;

    if (!canConfirmBooking) {
      if (selectedWalkInCount === 0) {
        const shouldJoinMemberWaitlist = confirm(
          "This session is full. Do you want to join the member waiting list?"
        );

        if (!shouldJoinMemberWaitlist) {
          return;
        }

        waitlistType = "member";
        waitlistStatus = "waiting";
      } else {
        const shouldJoinWalkInWaitlist = confirm(
          "Not enough confirmed slots for your walk-in guest(s). Do you want to join the walk-in waiting list?"
        );

        if (!shouldJoinWalkInWaitlist) {
          return;
        }

        waitlistType = "walkin";
        waitlistStatus = "waiting";
      }
    }

    const newBooking = {
      id: Date.now(),
      sessionId: sessionId,
      memberId: currentUser.memberId,
      status: "booked",
      bookedAt: new Date().toLocaleString(),
      walkInCount: selectedWalkInCount,
      walkInNames: walkInNames,
      waitlistType: waitlistType,
      waitlistStatus: waitlistStatus,
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

    setWalkInSelections((previousSelections) => ({
      ...previousSelections,
      [sessionId]: {
        bringWalkIn: false,
        count: 1,
        names: [],
      },
    }));

    if (waitlistStatus === "waiting") {
      logActivity({
        action: "join_waitlist",
        targetType: "session",
        targetId: sessionId,
        description: `${currentMember.name} joined ${
          waitlistType === "walkin" ? "walk-in" : "member"
        } waiting list for session ${session.date}`,
      });

      alert("Waiting list request submitted.");
      return;
    }

    logActivity({
      action: "book_session",
      targetType: "session",
      targetId: sessionId,
      description:
        selectedWalkInCount > 0
          ? `${currentMember.name} booked session ${session.date} with ${selectedWalkInCount} walk-in guest(s): ${walkInNames.join(", ")}`
          : `${currentMember.name} booked session ${session.date}`,
    });

    alert("Booking successful");
  }

  async function handleAdminAddMemberToSession(sessionId, memberId, addMode) {
    const session = sessions.find(
      (session) => Number(session.id) === Number(sessionId)
    );
    const member = members.find(
      (member) => Number(member.id) === Number(memberId)
    );

    if (!session) {
      alert("Session not found");
      return false;
    }

    if (session.chargeStatus === "charged") {
      alert("Charged sessions cannot be changed.");
      return false;
    }

    if (!member) {
      alert("Please select a member.");
      return false;
    }

    if (member.status !== "active") {
      alert("Only active members can be added to a session.");
      return false;
    }

    const alreadyHasBooking = sessionBookings.some(
      (booking) =>
        Number(booking.sessionId) === Number(sessionId) &&
        Number(booking.memberId) === Number(memberId) &&
        booking.status !== "cancelled" &&
        booking.waitlistStatus !== "removed"
    );

    if (alreadyHasBooking) {
      alert("This member already has a booking or waiting list request for this session.");
      return false;
    }

    const isWaiting = addMode === "waiting";

    if (!isWaiting && getSessionRemainingParticipantSlots(sessionId) < 1) {
      alert("No remaining player slots for a confirmed member booking.");
      return false;
    }

    const newBooking = {
      id: Date.now(),
      sessionId: session.id,
      memberId: member.id,
      status: "booked",
      bookedAt: new Date().toLocaleString(),
      cancelledAt: null,
      statusUpdatedAt: null,
      walkInCount: 0,
      walkInNames: [],
      lateCancelledWalkInCount: 0,
      lateCancelledWalkInNames: [],
      waitlistType: isWaiting ? "member" : null,
      waitlistStatus: isWaiting ? "waiting" : null,
    };

    setSessionBookings((previousBookings) => [
      newBooking,
      ...previousBookings,
    ]);

    try {
      await syncSessionBookingToSupabase(newBooking);
    } catch (error) {
      console.error("Admin add member cloud sync failed:", error);
      alertSupabaseBookingSyncFailed(error);
      return false;
    }

    logActivity({
      action: isWaiting ? "admin_add_member_waitlist" : "admin_add_member_booking",
      targetType: "session",
      targetId: String(session.id),
      description: `Admin added ${member.name} to ${
        isWaiting ? "member waiting list" : "confirmed booking"
      } for session ${session.date}`,
    });

    alert(
      isWaiting
        ? "Member added to waiting list."
        : "Member added to session."
    );
    return true;
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

    if (booking.waitlistStatus === "waiting") {
      const updatedBooking = {
        ...booking,
        status: "cancelled",
        cancelledAt: new Date().toLocaleString(),
        waitlistStatus: "removed",
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
          waitlistStatus: updatedBooking.waitlistStatus,
        });
      } catch (error) {
        alertSupabaseBookingSyncFailed(error);
        return;
      }

      alert("Waiting list request cancelled.");
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
    const booking = sessionBookings.find(
      (booking) => Number(booking.id) === Number(bookingId)
    );
    const session = sessions.find(
      (session) => Number(session.id) === Number(booking?.sessionId)
    );

    if (!booking) {
      alert("Booking not found");
      return;
    }

    if (!session) {
      alert("Session not found");
      return;
    }

    if (session.chargeStatus === "charged") {
      alert("Charged sessions cannot be changed.");
      return;
    }

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

  async function handleAdminRemoveMemberFromSession(sessionId, bookingId) {
    const session = sessions.find(
      (session) => Number(session.id) === Number(sessionId)
    );
    const booking = sessionBookings.find(
      (booking) => Number(booking.id) === Number(bookingId)
    );

    if (!session) {
      alert("Session not found");
      return;
    }

    if (session.chargeStatus === "charged") {
      alert("Charged sessions cannot be changed.");
      return;
    }

    if (!booking || Number(booking.sessionId) !== Number(sessionId)) {
      alert("Booking not found");
      return;
    }

    const shouldRemove = confirm("Remove this member from the session?");

    if (!shouldRemove) {
      return;
    }

    setSessionBookings((previousBookings) =>
      previousBookings.filter(
        (booking) => Number(booking.id) !== Number(bookingId)
      )
    );

    try {
      await syncSessionBookingDeleteToSupabase(bookingId);
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
      return;
    }

    const member = members.find(
      (member) => Number(member.id) === Number(booking.memberId)
    );

    logActivity({
      action: "admin_remove_session_booking",
      targetType: "session",
      targetId: String(session.id),
      description: `Admin removed ${
        member?.name || "Unknown Member"
      } from session ${session.date}`,
    });

    alert("Member removed from session.");
  }

  async function handleUpdateBookingWalkIns(bookingId, walkInCount, walkInNamesText) {
    const booking = sessionBookings.find(
      (booking) => Number(booking.id) === Number(bookingId)
    );

    if (!booking) {
      alert("Booking not found");
      return;
    }

    const session = sessions.find(
      (session) => Number(session.id) === Number(booking.sessionId)
    );

    if (!session) {
      alert("Session not found");
      return;
    }

    if (session.chargeStatus === "charged") {
      alert("Charged sessions cannot be changed.");
      return;
    }

    const nextWalkInCount = Math.max(0, Number(walkInCount || 0));
    const parsedWalkInNames = String(walkInNamesText || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const nextWalkInNames = nextWalkInCount > 0 ? parsedWalkInNames : [];

    if (nextWalkInCount > 0 && nextWalkInNames.length !== nextWalkInCount) {
      alert("Walk-in names must match walk-in count.");
      return;
    }

    const confirmedBookings = getSessionConfirmedBookings(session.id);
    const currentConfirmedBooking = confirmedBookings.find(
      (item) => Number(item.id) === Number(booking.id)
    );
    const currentWalkInCount = Number(currentConfirmedBooking?.walkInCount || 0);
    const nextTotalParticipants =
      getSessionTotalParticipantCount(session.id) -
      currentWalkInCount +
      nextWalkInCount;
    const nextTotalWalkIns =
      getSessionWalkInCount(session.id) - currentWalkInCount + nextWalkInCount;

    if (
      nextTotalParticipants > Number(session.maxPlayers || 0) ||
      nextTotalWalkIns > Number(session.walkInLimit ?? 5)
    ) {
      alert("Not enough slots for this walk-in update.");
      return;
    }

    const updatedBooking = {
      ...booking,
      walkInCount: nextWalkInCount,
      walkInNames: nextWalkInNames,
      statusUpdatedAt: new Date().toLocaleString(),
    };

    setSessionBookings((previousBookings) =>
      previousBookings.map((item) =>
        Number(item.id) === Number(bookingId) ? updatedBooking : item
      )
    );

    try {
      await syncSessionBookingUpdateToSupabase(bookingId, {
        walkInCount: updatedBooking.walkInCount,
        walkInNames: updatedBooking.walkInNames,
        statusUpdatedAt: updatedBooking.statusUpdatedAt,
      });
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
    }
  }

  async function handleMemberUpdateBookingWalkIns(
    sessionId,
    walkInCount,
    walkInNames
  ) {
    const session = sessions.find(
      (session) => Number(session.id) === Number(sessionId)
    );
    const booking = sessionBookings.find(
      (booking) =>
        Number(booking.sessionId) === Number(sessionId) &&
        Number(booking.memberId) === Number(currentUser.memberId) &&
        booking.status !== "cancelled" &&
        booking.waitlistStatus !== "waiting" &&
        booking.waitlistStatus !== "removed"
    );

    if (!session) {
      alert("Session not found");
      return false;
    }

    if (!booking) {
      alert("Booking not found");
      return false;
    }

    const newWalkInCount = Number(walkInCount || 0);

    if (Number.isNaN(newWalkInCount) || newWalkInCount < 0) {
      alert("Please enter a valid walk-in count");
      return false;
    }

    const cleanedWalkInNames = (walkInNames || [])
      .slice(0, newWalkInCount)
      .map((name) => String(name || "").trim());

    if (
      newWalkInCount > 0 &&
      (cleanedWalkInNames.length !== newWalkInCount ||
        cleanedWalkInNames.some((name) => name === ""))
    ) {
      alert("Please enter all walk-in guest names");
      return false;
    }

    const oldWalkInCount = Number(booking.walkInCount || 0);
    const oldWalkInNames = booking.walkInNames || [];
    const isReducingAfterCutoff =
      isPastCancelCutoff(session) && newWalkInCount < oldWalkInCount;
    let lateCancelledWalkInCount = Number(
      booking.lateCancelledWalkInCount || 0
    );
    let lateCancelledWalkInNames = [
      ...(booking.lateCancelledWalkInNames || []),
    ];

    if (isReducingAfterCutoff) {
      const shouldContinue = confirm(
        "Cancel cutoff has passed. Removed walk-in guest(s) may still be charged. Continue?"
      );

      if (!shouldContinue) {
        return false;
      }

      const difference = oldWalkInCount - newWalkInCount;
      const removedNamesByDiff = oldWalkInNames.filter(
        (name) => !cleanedWalkInNames.includes(name)
      );
      const removedNames =
        removedNamesByDiff.length >= difference
          ? removedNamesByDiff.slice(0, difference)
          : [
              ...removedNamesByDiff,
              ...oldWalkInNames.slice(newWalkInCount),
            ].slice(0, difference);

      lateCancelledWalkInCount += difference;
      lateCancelledWalkInNames = [
        ...lateCancelledWalkInNames,
        ...removedNames,
      ];
    }

    const newTotalParticipants =
      getSessionTotalParticipantCount(sessionId) -
      oldWalkInCount +
      newWalkInCount;
    const newTotalWalkIns =
      getSessionWalkInCount(sessionId) - oldWalkInCount + newWalkInCount;

    if (newTotalParticipants > Number(session.maxPlayers || 0)) {
      alert("This session does not have enough slots for these walk-in guests.");
      return false;
    }

    if (newTotalWalkIns > Number(session.walkInLimit ?? 5)) {
      alert("Walk-in slots are full. Please contact admin.");
      return false;
    }

    const updatedBooking = {
      ...booking,
      walkInCount: newWalkInCount,
      walkInNames: newWalkInCount > 0 ? cleanedWalkInNames : [],
      lateCancelledWalkInCount: lateCancelledWalkInCount,
      lateCancelledWalkInNames: lateCancelledWalkInNames,
      statusUpdatedAt: new Date().toLocaleString(),
    };

    setSessionBookings((previousBookings) =>
      previousBookings.map((item) =>
        Number(item.id) === Number(booking.id) ? updatedBooking : item
      )
    );

    try {
      await syncSessionBookingUpdateToSupabase(booking.id, {
        walkInCount: updatedBooking.walkInCount,
        walkInNames: updatedBooking.walkInNames,
        lateCancelledWalkInCount: updatedBooking.lateCancelledWalkInCount,
        lateCancelledWalkInNames: updatedBooking.lateCancelledWalkInNames,
        statusUpdatedAt: updatedBooking.statusUpdatedAt,
      });
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
      return false;
    }

    const memberData = members.find(
      (member) => Number(member.id) === Number(currentUser.memberId)
    );
    logActivity({
      action: "update_booking_walkins",
      targetType: "session",
      targetId: String(sessionId),
      description: `${memberData?.name || currentUser.name} updated walk-in guests for ${session.date}: ${
        updatedBooking.walkInNames.join(", ") || "none"
      }`,
    });

    alert("Walk-in guests updated successfully.");
    return true;
  }

  async function handleAddIndependentWalkins(sessionId, walkinNames, status) {
    const session = sessions.find(
      (session) => Number(session.id) === Number(sessionId)
    );

    if (!session) {
      alert("Session not found");
      return false;
    }

    const cleanedNames = (walkinNames || []).map((name) =>
      String(name || "").trim()
    );

    if (cleanedNames.length === 0 || cleanedNames.some((name) => name === "")) {
      alert("Please enter every walk-in name before adding.");
      return false;
    }

    const nextStatus = status === "waiting" ? "waiting" : "confirmed";

    if (nextStatus === "confirmed") {
      const remainingTotalSlots = getSessionRemainingParticipantSlots(sessionId);
      const remainingWalkInSlots = getSessionRemainingWalkInSlots(sessionId);

      if (
        cleanedNames.length > remainingTotalSlots ||
        cleanedNames.length > remainingWalkInSlots
      ) {
        alert(
          `Not enough space for ${cleanedNames.length} confirmed independent walk-in(s). Remaining player slots: ${remainingTotalSlots}. Remaining walk-in slots: ${remainingWalkInSlots}.`
        );
        return false;
      }
    }

    const createdAt = new Date().toLocaleString();
    const idBase = Date.now();
    const newWalkins = cleanedNames.map((name, index) => ({
      id: idBase + index,
      sessionId: session.id,
      name: name,
      status: nextStatus,
      createdAt: createdAt,
    }));

    setSessionWalkins((previousWalkins) => [
      ...newWalkins,
      ...previousWalkins,
    ]);

    try {
      await Promise.all(
        newWalkins.map((walkin) => syncSessionWalkinToSupabase(walkin))
      );
    } catch (error) {
      alertSupabaseWalkinSyncFailed(error);
      return false;
    }

    logActivity({
      action: "add_independent_walkins",
      targetType: "session",
      targetId: String(session.id),
      description: `Added ${newWalkins.length} independent ${nextStatus} walk-in(s) for ${session.date}: ${cleanedNames.join(", ")}`,
    });

    return true;
  }

  async function handlePromoteIndependentWalkin(walkinId) {
    const walkin = sessionWalkins.find(
      (walkin) => Number(walkin.id) === Number(walkinId)
    );

    if (!walkin) {
      alert("Walk-in not found");
      return;
    }

    const session = sessions.find(
      (session) => Number(session.id) === Number(walkin.sessionId)
    );

    if (!session) {
      alert("Session not found");
      return;
    }

    if (
      getSessionRemainingParticipantSlots(session.id) < 1 ||
      getSessionRemainingWalkInSlots(session.id) < 1
    ) {
      alert("Not enough slots to promote this walk-in.");
      return;
    }

    const updatedAt = new Date().toLocaleString();
    const updatedWalkin = {
      ...walkin,
      status: "confirmed",
      createdAt: walkin.createdAt || updatedAt,
    };

    setSessionWalkins((previousWalkins) =>
      previousWalkins.map((item) =>
        Number(item.id) === Number(walkinId) ? updatedWalkin : item
      )
    );

    try {
      await syncSessionWalkinUpdateToSupabase(walkinId, {
        status: "confirmed",
      });
    } catch (error) {
      alertSupabaseWalkinSyncFailed(error);
      return;
    }

    logActivity({
      action: "promote_independent_walkin",
      targetType: "session",
      targetId: String(session.id),
      description: `Promoted independent walk-in ${walkin.name} for ${session.date}`,
    });
  }

  async function handleCancelIndependentWalkin(walkinId) {
    const walkin = sessionWalkins.find(
      (walkin) => Number(walkin.id) === Number(walkinId)
    );

    if (!walkin) {
      alert("Walk-in not found");
      return;
    }

    setSessionWalkins((previousWalkins) =>
      previousWalkins.map((item) =>
        Number(item.id) === Number(walkinId)
          ? { ...item, status: "cancelled" }
          : item
      )
    );

    try {
      await syncSessionWalkinUpdateToSupabase(walkinId, {
        status: "cancelled",
      });
    } catch (error) {
      alertSupabaseWalkinSyncFailed(error);
      return;
    }

    logActivity({
      action: "cancel_independent_walkin",
      targetType: "session",
      targetId: String(walkin.sessionId),
      description: `Cancelled independent walk-in ${walkin.name}`,
    });
  }

  async function handleRemoveIndependentWalkin(walkinId) {
    const walkin = sessionWalkins.find(
      (walkin) => Number(walkin.id) === Number(walkinId)
    );

    if (!walkin) {
      alert("Walk-in not found");
      return;
    }

    setSessionWalkins((previousWalkins) =>
      previousWalkins.map((item) =>
        Number(item.id) === Number(walkinId)
          ? { ...item, status: "removed" }
          : item
      )
    );

    try {
      await syncSessionWalkinUpdateToSupabase(walkinId, {
        status: "removed",
      });
    } catch (error) {
      alertSupabaseWalkinSyncFailed(error);
      return;
    }

    logActivity({
      action: "remove_independent_walkin",
      targetType: "session",
      targetId: String(walkin.sessionId),
      description: `Removed independent walk-in ${walkin.name}`,
    });
  }

  async function handlePromoteWaitlistBooking(bookingId) {
    const booking = sessionBookings.find(
      (booking) => Number(booking.id) === Number(bookingId)
    );

    if (!booking) {
      alert("Booking not found");
      return;
    }

    const session = sessions.find(
      (session) => Number(session.id) === Number(booking.sessionId)
    );

    if (!session) {
      alert("Session not found");
      return;
    }

    const participantsToAdd =
      booking.waitlistType === "walkin"
        ? 1 + Number(booking.walkInCount || 0)
        : 1;
    const walkInsToAdd =
      booking.waitlistType === "walkin" ? Number(booking.walkInCount || 0) : 0;
    const nextTotalParticipants =
      getSessionTotalParticipantCount(session.id) + participantsToAdd;
    const nextWalkInCount = getSessionWalkInCount(session.id) + walkInsToAdd;

    if (
      nextTotalParticipants > Number(session.maxPlayers || 0) ||
      nextWalkInCount > Number(session.walkInLimit ?? 5)
    ) {
      alert("Not enough slots to promote this waiting list request.");
      return;
    }

    const updatedBooking = {
      ...booking,
      status: "booked",
      waitlistType: null,
      waitlistStatus: null,
      statusUpdatedAt: new Date().toLocaleString(),
    };

    setSessionBookings((previousBookings) =>
      previousBookings.map((item) =>
        Number(item.id) === Number(bookingId) ? updatedBooking : item
      )
    );

    try {
      await syncSessionBookingUpdateToSupabase(bookingId, {
        status: updatedBooking.status,
        waitlistType: updatedBooking.waitlistType,
        waitlistStatus: updatedBooking.waitlistStatus,
        statusUpdatedAt: updatedBooking.statusUpdatedAt,
      });
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
      return;
    }

    const member = members.find(
      (member) => Number(member.id) === Number(booking.memberId)
    );
    logActivity({
      action: "promote_waitlist",
      targetType: "session",
      targetId: String(session.id),
      description: `Promoted waiting list request for ${
        member?.name || "Unknown Member"
      } on ${session.date}`,
    });

    alert("Waiting list request promoted.");
  }

  async function handleRemoveWaitlistBooking(bookingId) {
    const booking = sessionBookings.find(
      (booking) => Number(booking.id) === Number(bookingId)
    );

    if (!booking) {
      alert("Booking not found");
      return;
    }

    const updatedBooking = {
      ...booking,
      status: "cancelled",
      waitlistStatus: "removed",
      cancelledAt: new Date().toLocaleString(),
      statusUpdatedAt: new Date().toLocaleString(),
    };

    setSessionBookings((previousBookings) =>
      previousBookings.map((item) =>
        Number(item.id) === Number(bookingId) ? updatedBooking : item
      )
    );

    try {
      await syncSessionBookingUpdateToSupabase(bookingId, {
        status: updatedBooking.status,
        waitlistStatus: updatedBooking.waitlistStatus,
        cancelledAt: updatedBooking.cancelledAt,
        statusUpdatedAt: updatedBooking.statusUpdatedAt,
      });
    } catch (error) {
      alertSupabaseBookingSyncFailed(error);
      return;
    }

    logActivity({
      action: "remove_waitlist",
      targetType: "session",
      targetId: String(booking.sessionId),
      description: `Removed waiting list request #${booking.id}`,
    });

    alert("Waiting list request removed.");
  }

  async function handleBulkUpdateSessionBookingStatus(sessionId, action) {
    const statusUpdatedAt = new Date().toLocaleString();
    const changedBookings = sessionBookings
      .filter(
        (booking) =>
          Number(booking.sessionId) === Number(sessionId) &&
          isConfirmedSessionBooking(booking)
      )
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
    if (field === "walkInLimit") {
      const session = sessions.find(
        (session) => Number(session.id) === Number(sessionId)
      );
      const nextWalkInLimit = Number(value || 0);

      if (!session) {
        alert("Session not found");
        return;
      }

      if (
        nextWalkInLimit < getSessionWalkInCount(sessionId) ||
        nextWalkInLimit > Number(session.maxPlayers || 0)
      ) {
        alert("Walk-in limit must be between current walk-ins and max players.");
        return;
      }
    }

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
    const paymentReminderMembers = members
      .filter(
        (member) =>
          member.status === "active" &&
          Number(member.balance || 0) < MINIMUM_BOOKING_BALANCE
      )
      .sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0));
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
    const currentDate = new Date();
    const monthlyTransactions = transactions.filter((transaction) => {
      const transactionDate = safeParseDate(transaction.date);

      return (
        transactionDate &&
        transactionDate.getFullYear() === currentDate.getFullYear() &&
        transactionDate.getMonth() === currentDate.getMonth()
      );
    });
    const thisMonthReloadTotal = monthlyTransactions
      .filter((transaction) => {
        const amount = Number(transaction.amount || 0);
        const description = String(transaction.description || "").toLowerCase();
        const type = String(transaction.type || "").toLowerCase();

        return (
          amount > 0 &&
          (description.includes("reload") || type === "reload")
        );
      })
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const thisMonthSessionCharges = monthlyTransactions
      .filter((transaction) => {
        const amount = Number(transaction.amount || 0);
        const description = String(transaction.description || "").toLowerCase();

        return amount < 0 && description.includes("session charge");
      })
      .reduce(
        (total, transaction) => total + Math.abs(Number(transaction.amount || 0)),
        0
      );
    const thisMonthExpenses = monthlyTransactions
      .filter((transaction) => {
        const amount = Number(transaction.amount || 0);
        const description = String(transaction.description || "").toLowerCase();

        return amount < 0 && description.includes("expense");
      })
      .reduce(
        (total, transaction) => total + Math.abs(Number(transaction.amount || 0)),
        0
      );
    const negativeBalanceTotal = members
      .filter((member) => Number(member.balance || 0) < 0)
      .reduce((total, member) => total + Number(member.balance || 0), 0);
    const lowBalanceMembers = members.filter(
      (member) =>
        member.status === "active" &&
        Number(member.balance || 0) >= 0 &&
        Number(member.balance || 0) < MINIMUM_BOOKING_BALANCE
    );
    const bookingCountByMemberId = sessionBookings.reduce((bookingCounts, booking) => {
      if (!isConfirmedSessionBooking(booking)) {
        return bookingCounts;
      }

      const memberId = String(booking.memberId);
      bookingCounts[memberId] = (bookingCounts[memberId] || 0) + 1;
      return bookingCounts;
    }, {});
    const topActiveMembersByBooking = Object.entries(bookingCountByMemberId)
      .map(([memberId, bookingCount]) => {
        const member = members.find(
          (member) =>
            Number(member.id) === Number(memberId) &&
            member.status === "active"
        );

        return member
          ? {
              memberId,
              name: member.name,
              bookingCount,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.bookingCount !== a.bookingCount) {
          return b.bookingCount - a.bookingCount;
        }

        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);

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
              className={`dashboard-section-toggle ${showSmartToolsSection ? "active" : ""}`}
              onClick={() => setShowSmartToolsSection(!showSmartToolsSection)}
            >
              Smart Tools
            </button>

            <button
              className={`dashboard-section-toggle ${showAnalyticsSection ? "active" : ""}`}
              onClick={() => setShowAnalyticsSection(!showAnalyticsSection)}
            >
              Analytics
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
              className={`dashboard-section-toggle ${showPaymentReminderSection ? "active" : ""}`}
              onClick={() =>
                setShowPaymentReminderSection(!showPaymentReminderSection)
              }
            >
              Reminders
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

          {showSmartToolsSection && (
            <section className="collapsible-section">
              <div className="collapsible-section-header">
                <div>
                  <h2>Smart Tools</h2>
                  <p>Parse WhatsApp session lists into a safe import preview.</p>
                </div>
              </div>

              <div className="panel ai-import-panel">
                <div className="ai-import-header">
                  <div>
                    <span className="admin-session-eyebrow">Gemini Parser</span>
                    <h2>AI Import Session List</h2>
                    <p>
                      Paste a WhatsApp-style list. Gemini only parses text;
                      nothing is created until you confirm the preview.
                    </p>
                  </div>
                </div>

                <label>WhatsApp Session List</label>
                <textarea
                  className="ai-import-textarea"
                  value={aiImportText}
                  maxLength={AI_IMPORT_MAX_TEXT_LENGTH}
                  placeholder="Paste session list here..."
                  onChange={(event) => setAiImportText(event.target.value)}
                />
                <div className="ai-import-toolbar">
                  <span>
                    {aiImportText.length}/{AI_IMPORT_MAX_TEXT_LENGTH}
                  </span>
                  <button
                    className="action-button compact-button"
                    disabled={aiImportIsParsing || aiImportText.trim() === ""}
                    onClick={handleParseAiSessionList}
                  >
                    {aiImportIsParsing ? "Parsing..." : "Parse with Gemini"}
                  </button>
                </div>

                {aiImportError && (
                  <p className="ai-import-error">{aiImportError}</p>
                )}

                {aiImportPreview && (
                  <div className="ai-import-preview">
                    <div className="ai-import-preview-section">
                      <div className="ai-import-section-heading">
                        <h3>Session Details</h3>
                        <span>Required before import</span>
                      </div>

                      <div className="ai-import-session-grid">
                        <div>
                          <label>Title / Note</label>
                          <input
                            type="text"
                            value={aiImportSessionDraft.title}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "title",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Venue</label>
                          <input
                            type="text"
                            value={aiImportSessionDraft.venue}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "venue",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Date</label>
                          <input
                            type="date"
                            value={aiImportSessionDraft.date}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "date",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Time</label>
                          <input
                            type="text"
                            value={aiImportSessionDraft.time}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "time",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Court Count</label>
                          <input
                            type="number"
                            min="0"
                            value={aiImportSessionDraft.courtCount}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "courtCount",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Court Numbers / Note</label>
                          <input
                            type="text"
                            value={aiImportSessionDraft.courtNumbers}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "courtNumbers",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Walk-in Limit</label>
                          <input
                            type="number"
                            min="0"
                            value={aiImportSessionDraft.walkInLimit}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "walkInLimit",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Walk-in Fee</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={aiImportSessionDraft.walkInFee}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "walkInFee",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Max Players</label>
                          <input
                            type="number"
                            min="1"
                            value={aiImportSessionDraft.maxPlayers}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "maxPlayers",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Court Fee Total</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={aiImportSessionDraft.courtFeeTotal}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "courtFeeTotal",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Cancel Cutoff</label>
                          <input
                            type="text"
                            value={aiImportSessionDraft.cancelCutoff}
                            onChange={(event) =>
                              handleAiImportSessionDraftChange(
                                "cancelCutoff",
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="ai-import-preview-section">
                      <div className="ai-import-section-heading">
                        <h3>Matched Members</h3>
                        <span>
                          {
                            aiImportPreview.participants.filter(
                              (row) => row.matchStatus === "matched"
                            ).length
                          }{" "}
                          matched
                        </span>
                      </div>
                      <div className="ai-import-name-list">
                        {aiImportPreview.participants
                          .filter((row) => row.matchStatus === "matched")
                          .map((row) => (
                            <div key={row.id} className="ai-import-name-row">
                              <div>
                                <strong>{row.memberName}</strong>
                                <small>{row.rawName}</small>
                              </div>
                              <select
                                value={getAiImportResolvedMemberId(row)}
                                onChange={(event) =>
                                  handleAiImportResolutionChange(
                                    row.id,
                                    event.target.value
                                  )
                                }
                              >
                                <option value="">Skip this row</option>
                                {getAiImportActiveMembers().map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="ai-import-preview-grid">
                      <div className="ai-import-preview-section">
                        <div className="ai-import-section-heading">
                          <h3>Ambiguous Names</h3>
                          <span>
                            {
                              aiImportPreview.participants.filter(
                                (row) => row.matchStatus === "ambiguous"
                              ).length
                            }
                          </span>
                        </div>
                        <div className="ai-import-name-list">
                          {aiImportPreview.participants
                            .filter((row) => row.matchStatus === "ambiguous")
                            .map((row) => (
                              <div key={row.id} className="ai-import-name-row">
                                <div>
                                  <strong>{row.memberName}</strong>
                                  <small>
                                    Candidates:{" "}
                                    {row.candidates
                                      .map((candidate) => candidate.name)
                                      .join(", ")}
                                  </small>
                                </div>
                                <select
                                  value={getAiImportResolvedMemberId(row)}
                                  onChange={(event) =>
                                    handleAiImportResolutionChange(
                                      row.id,
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="">Skip this row</option>
                                  {getAiImportActiveMembers().map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="ai-import-preview-section">
                        <div className="ai-import-section-heading">
                          <h3>Unmatched Names</h3>
                          <span>
                            {
                              aiImportPreview.participants.filter(
                                (row) => row.matchStatus === "unmatched"
                              ).length
                            }
                          </span>
                        </div>
                        <div className="ai-import-name-list">
                          {aiImportPreview.participants
                            .filter((row) => row.matchStatus === "unmatched")
                            .map((row) => (
                              <div key={row.id} className="ai-import-name-row">
                                <div>
                                  <strong>{row.memberName || row.rawName}</strong>
                                  <small>No confident active member match</small>
                                </div>
                                <select
                                  value={getAiImportResolvedMemberId(row)}
                                  onChange={(event) =>
                                    handleAiImportResolutionChange(
                                      row.id,
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="">Skip this row</option>
                                  {getAiImportActiveMembers().map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="ai-import-preview-grid">
                      <div className="ai-import-preview-section">
                        <div className="ai-import-section-heading">
                          <h3>Member-attached Guests</h3>
                          <span>
                            {
                              aiImportPreview.participants.filter(
                                (row) => Number(row.walkInCount || 0) > 0
                              ).length
                            }
                          </span>
                        </div>
                        {aiImportPreview.participants.filter(
                          (row) => Number(row.walkInCount || 0) > 0
                        ).length === 0 ? (
                          <p className="empty-text">No member-attached guests.</p>
                        ) : (
                          <div className="ai-import-chip-list">
                            {aiImportPreview.participants
                              .filter((row) => Number(row.walkInCount || 0) > 0)
                              .map((row) => (
                                <span key={`walkin-${row.id}`}>
                                  {row.memberName}: {row.walkInCount} walk-in
                                  {row.walkInNames.length > 0
                                    ? ` (${row.walkInNames.join(", ")})`
                                    : ""}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="ai-import-preview-section">
                        <div className="ai-import-section-heading">
                          <h3>Walk-in Rows</h3>
                          <span>{aiImportPreview.independentWalkins.length}</span>
                        </div>
                        {aiImportPreview.independentWalkins.length === 0 ? (
                          <p className="empty-text">No walk-in rows.</p>
                        ) : (
                          <div className="ai-import-chip-list">
                            {aiImportPreview.independentWalkins.map(
                              (walkin, index) => (
                                <span key={`${walkin.name}-${index}`}>
                                  {walkin.name} · {walkin.status}
                                  {walkin.source ? ` · ${walkin.source}` : ""}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ai-import-preview-section">
                      <div className="ai-import-section-heading">
                        <h3>Warnings</h3>
                        <span>
                          {
                            [
                              ...(aiImportPreview.warnings || []),
                              ...getAiImportConfirmIssues(),
                            ].filter(Boolean).length
                          }
                        </span>
                      </div>
                      {[
                        ...(aiImportPreview.warnings || []),
                        ...getAiImportConfirmIssues(),
                      ].filter(Boolean).length === 0 ? (
                        <p className="empty-text">No warnings.</p>
                      ) : (
                        <ul className="ai-import-warning-list">
                          {[
                            ...(aiImportPreview.warnings || []),
                            ...getAiImportConfirmIssues(),
                          ]
                            .filter(Boolean)
                            .map((warning, index) => (
                              <li key={`${warning}-${index}`}>{warning}</li>
                            ))}
                        </ul>
                      )}
                    </div>

                    <div className="ai-import-confirm-bar">
                      <div>
                        <strong>
                          {getAiImportResolvedRows().length} member booking(s)
                        </strong>
                        <span>
                          Unresolved names will be skipped. No wallet charge will
                          be created.
                        </span>
                      </div>
                      <button
                        className="action-button compact-button"
                        disabled={
                          aiImportIsConfirming ||
                          getAiImportConfirmIssues().length > 0
                        }
                        onClick={handleConfirmAiSessionImport}
                      >
                        {aiImportIsConfirming ? "Importing..." : "Confirm Import"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {showAnalyticsSection && (
            <section className="collapsible-section">
              <div className="collapsible-section-header">
                <div>
                  <h2>Admin Analytics</h2>
                  <p>
                    Quick overview of reloads, charges, balances, and member activity.
                  </p>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <span className="analytics-label">This Month Reload Total</span>
                  <strong className="analytics-value">
                    {formatMoney(thisMonthReloadTotal)}
                  </strong>
                  <p className="analytics-muted">Approved reload transactions this month.</p>
                </div>

                <div className="analytics-card">
                  <span className="analytics-label">This Month Session Charges</span>
                  <strong className="analytics-value">
                    {formatMoney(thisMonthSessionCharges)}
                  </strong>
                  <p className="analytics-muted">Session charge deductions this month.</p>
                </div>

                <div className="analytics-card">
                  <span className="analytics-label">This Month Expenses</span>
                  <strong className="analytics-value">
                    {formatMoney(thisMonthExpenses)}
                  </strong>
                  <p className="analytics-muted">Expense deductions this month.</p>
                </div>

                <div className="analytics-card">
                  <span className="analytics-label">Negative Balance Total</span>
                  <strong className="analytics-value negative">
                    {formatMoney(negativeBalanceTotal)}
                  </strong>
                  <p className="analytics-muted">Outstanding balance across all members.</p>
                </div>

                <div className="analytics-card">
                  <span className="analytics-label">Low Balance Members</span>
                  <strong className="analytics-value">
                    {lowBalanceMembers.length}
                  </strong>
                  <p className="analytics-muted">
                    Active members below {formatMoney(MINIMUM_BOOKING_BALANCE)}.
                  </p>
                </div>

                <div className="analytics-card analytics-card-wide">
                  <span className="analytics-label">Top Active Members by Booking</span>

                  {topActiveMembersByBooking.length === 0 ? (
                    <p className="analytics-muted">No data yet.</p>
                  ) : (
                    <div className="analytics-list">
                      {topActiveMembersByBooking.map((member) => (
                        <div className="analytics-list-row" key={member.memberId}>
                          <span>{member.name}</span>
                          <strong>{member.bookingCount} bookings</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

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

                    <button
                      className="danger-button compact-button"
                      onClick={handleResetProductionMembersJune2026}
                    >
                      Reset Production Members - June 2026
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {showPaymentReminderSection && (
            <section className="collapsible-section">
              <div className="collapsible-section-header">
                <div>
                  <h2>Payment Reminders</h2>
                  <p>
                    Generate reload reminders for low or negative balance members.
                  </p>
                </div>
              </div>

              <div className="panel payment-reminder-panel">
                {paymentReminderMembers.length === 0 ? (
                  <p className="empty-text">No payment reminders needed.</p>
                ) : (
                  <div className="payment-reminder-grid">
                    {paymentReminderMembers.map((member) => {
                      const hasWhatsapp = Boolean(
                        normalizeWhatsappForLink(member.whatsapp)
                      );
                      const reminderType =
                        Number(member.balance || 0) < 0
                          ? "Negative Balance"
                          : "Low Balance";

                      return (
                        <div key={member.id} className="payment-reminder-card">
                          <div className="payment-reminder-card-header">
                            <div>
                              <h3>{member.name}</h3>
                              {member.whatsapp ? (
                                <p className="whatsapp-number">
                                  WhatsApp: {member.whatsapp}
                                </p>
                              ) : (
                                <p className="whatsapp-number muted">
                                  No WhatsApp number saved.
                                </p>
                              )}
                            </div>

                            <span
                              className={`reminder-type-badge ${
                                Number(member.balance || 0) < 0
                                  ? "negative"
                                  : "low"
                              }`}
                            >
                              {reminderType}
                            </span>
                          </div>

                          <div className="payment-reminder-balance">
                            <span>Current balance</span>
                            <strong
                              className={
                                Number(member.balance || 0) < 0
                                  ? "negative"
                                  : "positive"
                              }
                            >
                              {formatMoney(Number(member.balance || 0))}
                            </strong>
                          </div>

                          <p className="payment-reminder-message">
                            {getPaymentReminderMessage(member)}
                          </p>

                          <div className="reminder-actions">
                            <button
                              className="secondary-button compact-button"
                              onClick={() => handleCopyPaymentReminder(member)}
                            >
                              Copy Message
                            </button>

                            <button
                              className="action-button compact-button"
                              disabled={!hasWhatsapp}
                              onClick={() => handleOpenWhatsappReminder(member)}
                            >
                              Open WhatsApp
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
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
                    <th>Package</th>
                    <th>Price</th>
                    <th>Wallet Credit</th>
                    <th>Gift</th>
                    <th>Uniform</th>
                    <th>WhatsApp</th>
                    <th>Emergency Contact</th>
                    <th>Payment Proof</th>
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
                        <div className="pending-package-info">
                          <strong>{member.packageName || "-"}</strong>
                          {member.packageType && <span>{member.packageType}</span>}
                        </div>
                      </td>
                      <td>
                        {Number(member.packagePrice || 0) > 0
                          ? formatMoney(Number(member.packagePrice || 0))
                          : "-"}
                      </td>
                      <td>
                        {Number(member.packageCredit || 0) > 0
                          ? formatMoney(Number(member.packageCredit || 0))
                          : "-"}
                      </td>
                      <td>{member.giftChoice || "-"}</td>
                      <td>{member.uniformSize || "-"}</td>
                      <td>{member.whatsapp || "-"}</td>
                      <td>{member.emergencyContact || "-"}</td>
                      <td>
                        {member.registrationPaymentProofUrl ? (
                          <a
                            className="registration-proof-link"
                            href={member.registrationPaymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Proof
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
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
                        step="0.01"
                        inputMode="decimal"
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
                      step="0.01"
                      inputMode="decimal"
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

                  <div className="panel weekly-expense-panel">
                    <h2>Weekly Expense</h2>

                    <label>Total Expense</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
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

                    <div className="weekly-report-export">
                      <label>Report Date</label>
                      <input
                        type="date"
                        value={weeklyReportDate}
                        onChange={(event) =>
                          setWeeklyReportDate(event.target.value)
                        }
                      />

                      <button
                        className="secondary-button"
                        disabled={isExportingWeeklyReportPdf}
                        onClick={handleExportWeeklyReportPdf}
                      >
                        {isExportingWeeklyReportPdf
                          ? "Exporting..."
                          : "Export Weekly Report PDF"}
                      </button>
                    </div>
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
            getSessionConfirmedBookings={getSessionConfirmedBookings}
            getSessionBookings={getSessionBookings}
            getSessionMemberBookingCount={getSessionMemberBookingCount}
            getSessionMemberWaitlist={getSessionMemberWaitlist}
            getSessionChargeSummary={getSessionChargeSummary}
            getSessionConfirmedIndependentWalkins={
              getSessionConfirmedIndependentWalkins
            }
            getSessionIndependentWalkins={getSessionIndependentWalkins}
            getSessionRemainingParticipantSlots={getSessionRemainingParticipantSlots}
            getSessionTotalParticipantCount={getSessionTotalParticipantCount}
            getSessionWaitingIndependentWalkins={
              getSessionWaitingIndependentWalkins
            }
            getSessionWalkInCount={getSessionWalkInCount}
            getSessionWalkInWaitlist={getSessionWalkInWaitlist}
            handleAdminAddMemberToSession={handleAdminAddMemberToSession}
            handleAddIndependentWalkins={handleAddIndependentWalkins}
            handleCancelIndependentWalkin={handleCancelIndependentWalkin}
            handleCloseSession={handleCloseSession}
            handleCreateSession={handleCreateSession}
            handleFinalizeSessionCharge={handleFinalizeSessionCharge}
            handleOpenSession={handleOpenSession}
            handlePromoteIndependentWalkin={handlePromoteIndependentWalkin}
            handlePromoteWaitlistBooking={handlePromoteWaitlistBooking}
            handleAdminRemoveMemberFromSession={handleAdminRemoveMemberFromSession}
            handleRemoveIndependentWalkin={handleRemoveIndependentWalkin}
            handleRemoveWaitlistBooking={handleRemoveWaitlistBooking}
            handleBulkUpdateSessionBookingStatus={
              handleBulkUpdateSessionBookingStatus
            }
            handleUpdateBookingStatus={handleUpdateBookingStatus}
            handleUpdateBookingWalkIns={handleUpdateBookingWalkIns}
            handleUpdateSessionChargeField={handleUpdateSessionChargeField}
            members={members}
            newSessionCancelCutoff={newSessionCancelCutoff}
            newSessionCourtCount={newSessionCourtCount}
            newSessionCourtFeeTotal={newSessionCourtFeeTotal}
            newSessionDate={newSessionDate}
            newSessionMaxPlayers={newSessionMaxPlayers}
            newSessionTime={newSessionTime}
            newSessionVenue={newSessionVenue}
            newSessionWalkInLimit={newSessionWalkInLimit}
            sessions={sessions}
            setNewSessionCancelCutoff={setNewSessionCancelCutoff}
            setNewSessionCourtCount={setNewSessionCourtCount}
            setNewSessionCourtFeeTotal={setNewSessionCourtFeeTotal}
            setNewSessionDate={setNewSessionDate}
            setNewSessionMaxPlayers={setNewSessionMaxPlayers}
            setNewSessionTime={setNewSessionTime}
            setNewSessionVenue={setNewSessionVenue}
            setNewSessionWalkInLimit={setNewSessionWalkInLimit}
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
              <div className="admin-table-scroll pending-reload-table-wrap">
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
              </div>
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
          getSessionMemberBookingCount={getSessionMemberBookingCount}
          getSessionWalkInCount={getSessionWalkInCount}
          getSessionTotalParticipantCount={getSessionTotalParticipantCount}
          getSessionRemainingParticipantSlots={getSessionRemainingParticipantSlots}
          getSessionRemainingWalkInSlots={getSessionRemainingWalkInSlots}
          getSessionMemberWaitlist={getSessionMemberWaitlist}
          getSessionWalkInWaitlist={getSessionWalkInWaitlist}
          getSessionConfirmedIndependentWalkins={
            getSessionConfirmedIndependentWalkins
          }
          getSessionWaitingIndependentWalkins={
            getSessionWaitingIndependentWalkins
          }
          handleBookSession={handleBookSession}
          handleCancelSessionBooking={handleCancelSessionBooking}
          handleMemberUpdateBookingWalkIns={handleMemberUpdateBookingWalkIns}
          isPastCancelCutoff={isPastCancelCutoff}
          minimumBookingBalance={MINIMUM_BOOKING_BALANCE}
          walkInSelections={walkInSelections}
          setWalkInSelections={setWalkInSelections}
        />
      </>
    );
  }
  if (page === "register") {
    const selectedRegisterPackage = MEMBER_PACKAGES[registerPackageType];

    return (
      <>
        {renderSupabaseLoadNotice()}
        <div className="page">
          <Paper className="login-card registration-card premium-auth-card" shadow="xl">
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start">
                <div className="logo-box">
                  <img src="/byt-logo.jpeg" alt="BYT Logo" />
                </div>
                <Badge className="premium-badge" variant="light">
                  Member Onboarding
                </Badge>
              </Group>

              <div>
                <Title order={1}>BYT Member Package Registration</Title>
                <Text className="subtitle">
                  Choose your member package, complete your details, and upload payment proof for admin approval.
                </Text>
              </div>

              <Image
                className="package-image"
                src="/byt-member-packages.png"
                alt="BYT Member Packages"
                radius="xl"
              />

            <Stack className="form" gap="lg">
              <div className="registration-section">
                <Title order={2}>Choose Package</Title>
                <div className="package-selection-grid">
                  {Object.values(MEMBER_PACKAGES).map((memberPackage) => (
                    <Card
                      component="button"
                      key={memberPackage.packageType}
                      className={`package-card ${
                        registerPackageType === memberPackage.packageType
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setRegisterPackageType(memberPackage.packageType);
                        if (memberPackage.packageType !== "extreme") {
                          setRegisterUniformSize("");
                        }
                      }}
                    >
                      <span>{memberPackage.packageName}</span>
                      <strong className="package-price">
                        RM{memberPackage.packagePrice}
                      </strong>
                      <ul className="package-benefits">
                        <li>RM100 wallet credit</li>
                        <li>
                          Gift: choose wristband or headband
                        </li>
                        {memberPackage.packageType === "extreme" ? (
                          <li>Includes BYT Exclusive Member uniform</li>
                        ) : (
                          <li>No uniform included</li>
                        )}
                      </ul>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="registration-section">
                <Title order={2}>Gift Choice</Title>
                <Radio.Group value={registerGiftChoice} onChange={setRegisterGiftChoice}>
                  <div className="registration-choice-grid">
                    {GIFT_CHOICES.map((giftChoice) => (
                      <Radio
                        className="registration-radio"
                        key={giftChoice}
                        value={giftChoice}
                        label={giftChoice === "wristband" ? "Wristband" : "Headband"}
                      />
                    ))}
                  </div>
                </Radio.Group>
              </div>

              <div className="registration-section">
                <Title order={2}>Personal Details</Title>
                <div className="registration-form-grid">
                  <TextInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={registerName}
                    onChange={(event) => setRegisterName(event.target.value)}
                  />

                  <Select
                    label="Gender"
                    placeholder="Select gender"
                    value={registerGender || null}
                    data={["Male", "Female"]}
                    onChange={(value) => setRegisterGender(value || "")}
                  />

                  <DatePickerInput
                    className="registration-date-input"
                    label="Birthday"
                    placeholder="Select birthday"
                    value={registerBirthday || null}
                    maxDate={new Date().toISOString().split("T")[0]}
                    valueFormat="MMM D, YYYY"
                    onChange={(value) => setRegisterBirthday(value || "")}
                  />

                  <TextInput
                    label="WhatsApp / Mobile Number"
                    placeholder="Example: 0142889116"
                    value={registerWhatsapp}
                    onChange={(event) => setRegisterWhatsapp(event.target.value)}
                  />

                  <TextInput
                    label="Email"
                    type="email"
                    placeholder="Enter email"
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                  />

                  <TextInput
                    label="Emergency Contact"
                    placeholder="Parent 0123456789"
                    value={registerEmergencyContact}
                    onChange={(event) =>
                      setRegisterEmergencyContact(event.target.value)
                    }
                  />

                  <PasswordInput
                    label="Password"
                    placeholder="Create password"
                    value={registerPassword}
                    onChange={(event) =>
                      setRegisterPassword(event.target.value)
                    }
                  />

                  <PasswordInput
                    label="Confirm Password"
                    placeholder="Confirm password"
                    value={registerConfirmPassword}
                    onChange={(event) =>
                      setRegisterConfirmPassword(event.target.value)
                    }
                  />
                </div>
              </div>

              {selectedRegisterPackage?.packageType === "extreme" && (
                <div className="registration-section">
                  <Title order={2}>Uniform Size</Title>
                  <Select
                    placeholder="Select uniform size"
                    value={registerUniformSize || null}
                    data={UNIFORM_SIZES}
                    onChange={(value) => setRegisterUniformSize(value || "")}
                  />
                </div>
              )}

              <div className="registration-section">
                <Title order={2}>Payment</Title>
                <div className="registration-bank-box">
                  <span>Bank Transfer</span>
                  <strong>B.Y.T. ENTERPRISE</strong>
                  <p>UOB MALAYSIA</p>
                  <p>2383066532</p>
                  <small>Finance WhatsApp: 60142889116 Oscar Kho</small>
                </div>
                <Image
                  src="/duitnow-qr.png"
                  alt="BYT DuitNow QR"
                  className="bank-qr-image"
                  radius="lg"
                />
                <Text className="registration-helper-text">
                  Please upload your payment proof after transferring the membership fee.
                </Text>
                {selectedRegisterPackage && (
                  <Text className="registration-helper-text">
                    Selected package amount:{" "}
                    <strong>RM{selectedRegisterPackage.packagePrice}</strong>
                  </Text>
                )}
                <label>Payment Proof / Receipt Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setRegisterPaymentProof(event.target.files?.[0] || null)
                  }
                />
                {registerPaymentProof && (
                  <p className="payment-proof-preview">
                    Selected: {registerPaymentProof.name}
                  </p>
                )}
              </div>

              <div className="terms-box">
                <Text>
                  By registering as a BYT member, you agree to follow BYT Club rules, safety guidelines, privacy terms, and payment rules.
                </Text>
                <a
                  className="terms-link"
                  href="/byt-terms-and-conditions.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Terms & Conditions
                </a>
                <Checkbox
                  className="terms-checkbox"
                  checked={registerAgreedTerms}
                  onChange={(event) =>
                    setRegisterAgreedTerms(event.target.checked)
                  }
                  label="I agree to BYT Club Terms & Conditions"
                />
              </div>

              <Button
                className="login-button"
                onClick={handleRegister}
                disabled={isSubmittingRegistration}
                size="lg"
              >
                {isSubmittingRegistration
                  ? "Submitting Registration..."
                  : "Submit Registration"}
              </Button>

              <Button
                className="register-link-button"
                disabled={isSubmittingRegistration}
                variant="light"
                onClick={() => {
                  setAuthNotice("");
                  setPage("login");
                }}
              >
                Back to Login
              </Button>
            </Stack>
            </Stack>
          </Paper>
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
