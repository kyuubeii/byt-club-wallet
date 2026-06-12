import { supabase } from "../lib/supabaseClient.js";

function getSupabaseErrorMessage(error) {
  return error?.message || "Unknown Supabase error";
}

function nullable(value) {
  return value === undefined || value === "" ? null : value;
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

function toSupabaseMemberType(memberType) {
  if (memberType === "existing") {
    return "regular";
  }

  return memberType || null;
}

function toSupabaseMemberRow(member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email || null,
    balance: Number(member.balance || 0),
    status: member.status || "active",
    member_type: toSupabaseMemberType(member.memberType),
    whatsapp: member.whatsapp || null,
    package_type: member.packageType || null,
    package_name: member.packageName || null,
    package_price: Number(member.packagePrice || 0),
    package_credit: Number(member.packageCredit || 0),
    registration_fee: Number(member.registrationFee || 0),
    gift_choice: member.giftChoice || null,
    uniform_size: member.uniformSize || null,
    gender: member.gender || null,
    birthday: member.birthday || null,
    emergency_contact: member.emergencyContact || null,
    registration_payment_proof_name:
      member.registrationPaymentProofName || null,
    registration_payment_proof_url: member.registrationPaymentProofUrl || null,
    agreed_terms: Boolean(member.agreedTerms),
  };
}

function toSupabaseUserRow(user) {
  return {
    member_id: user.role === "member" ? Number(user.memberId) : null,
    name: user.name || "",
    email: user.email || "",
    password: user.password || "",
    role: user.role || "member",
  };
}

function toSupabaseSessionRow(session) {
  return {
    id: session.id,
    date: session.date,
    time: session.time,
    venue: session.venue,
    court_count: Number(session.courtCount || 0),
    max_players: Number(session.maxPlayers || 0),
    court_fee_total: Number(session.courtFeeTotal || 0),
    cancel_cutoff: nullable(session.cancelCutoff),
    walk_in_limit: Number(session.walkInLimit ?? 5),
    status: session.status || "open",
    charge_status: session.chargeStatus || "not_charged",
    shuttlecock_used: Number(session.shuttlecockUsed || 0),
    shuttlecock_rate: Number(session.shuttlecockRate || 0),
    other_fee_total: Number(session.otherFeeTotal || 0),
    charged_at: nullable(session.chargedAt),
    finalized_court_charge_per_player: nullable(
      session.finalizedCourtChargePerPlayer
    ),
    finalized_attended_charge_per_player: nullable(
      session.finalizedAttendedChargePerPlayer
    ),
  };
}

function toSupabaseSessionBookingRow(booking) {
  return {
    id: booking.id,
    session_id: booking.sessionId,
    member_id: booking.memberId,
    status: booking.status || "booked",
    booked_at: nullable(booking.bookedAt),
    cancelled_at: nullable(booking.cancelledAt),
    status_updated_at: nullable(booking.statusUpdatedAt),
    walk_in_count: Number(booking.walkInCount || 0),
    walk_in_names: booking.walkInNames || [],
    late_cancelled_walk_in_count: Number(booking.lateCancelledWalkInCount || 0),
    late_cancelled_walk_in_names: booking.lateCancelledWalkInNames || [],
    waitlist_type: nullable(booking.waitlistType),
    waitlist_status: nullable(booking.waitlistStatus),
  };
}

export function toSupabaseSessionWalkinRow(walkin) {
  return {
    id: walkin.id,
    session_id: walkin.sessionId,
    name: walkin.name || "",
    status: walkin.status || "confirmed",
    created_at: walkin.createdAt || new Date().toLocaleString(),
  };
}

function toSupabaseSessionUpdates(updates) {
  const supabaseUpdates = {};

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    supabaseUpdates.status = updates.status;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "chargeStatus")) {
    supabaseUpdates.charge_status = updates.chargeStatus;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "walkInLimit")) {
    supabaseUpdates.walk_in_limit = Number(updates.walkInLimit ?? 5);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "shuttlecockUsed")) {
    supabaseUpdates.shuttlecock_used = Number(updates.shuttlecockUsed || 0);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "shuttlecockRate")) {
    supabaseUpdates.shuttlecock_rate = Number(updates.shuttlecockRate || 0);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "otherFeeTotal")) {
    supabaseUpdates.other_fee_total = Number(updates.otherFeeTotal || 0);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "chargedAt")) {
    supabaseUpdates.charged_at = nullable(updates.chargedAt);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "finalizedCourtChargePerPlayer"
    )
  ) {
    supabaseUpdates.finalized_court_charge_per_player = nullable(
      updates.finalizedCourtChargePerPlayer
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "finalizedAttendedChargePerPlayer"
    )
  ) {
    supabaseUpdates.finalized_attended_charge_per_player = nullable(
      updates.finalizedAttendedChargePerPlayer
    );
  }

  return supabaseUpdates;
}

function toSupabaseSessionBookingUpdates(updates) {
  const supabaseUpdates = {};

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    supabaseUpdates.status = updates.status;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "cancelledAt")) {
    supabaseUpdates.cancelled_at = nullable(updates.cancelledAt);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "statusUpdatedAt")) {
    supabaseUpdates.status_updated_at = nullable(updates.statusUpdatedAt);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "walkInCount")) {
    supabaseUpdates.walk_in_count = Number(updates.walkInCount || 0);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "walkInNames")) {
    supabaseUpdates.walk_in_names = updates.walkInNames || [];
  }

  if (Object.prototype.hasOwnProperty.call(updates, "lateCancelledWalkInCount")) {
    supabaseUpdates.late_cancelled_walk_in_count = Number(
      updates.lateCancelledWalkInCount || 0
    );
  }

  if (Object.prototype.hasOwnProperty.call(updates, "lateCancelledWalkInNames")) {
    supabaseUpdates.late_cancelled_walk_in_names =
      updates.lateCancelledWalkInNames || [];
  }

  if (Object.prototype.hasOwnProperty.call(updates, "waitlistType")) {
    supabaseUpdates.waitlist_type = nullable(updates.waitlistType);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "waitlistStatus")) {
    supabaseUpdates.waitlist_status = nullable(updates.waitlistStatus);
  }

  return supabaseUpdates;
}

function toSupabaseSessionWalkinUpdates(updates) {
  const supabaseUpdates = {};

  if (Object.prototype.hasOwnProperty.call(updates, "sessionId")) {
    supabaseUpdates.session_id = updates.sessionId;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "name")) {
    supabaseUpdates.name = updates.name || "";
  }

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    supabaseUpdates.status = updates.status || "confirmed";
  }

  if (Object.prototype.hasOwnProperty.call(updates, "createdAt")) {
    supabaseUpdates.created_at = nullable(updates.createdAt);
  }

  return supabaseUpdates;
}

function toSupabaseTransactionRow(transaction) {
  return {
    id: transaction.id,
    member_id: transaction.memberId,
    date: transaction.date,
    description: transaction.description,
    amount: Number(transaction.amount || 0),
    type: transaction.type || null,
  };
}

function toSupabaseReloadRequestRow(request) {
  return {
    id: request.id,
    member_id: request.memberId,
    member_name: request.memberName || null,
    amount: Number(request.amount || 0),
    status: request.status || "Pending",
    date: request.date,
    screenshot_name: request.screenshotName || null,
    screenshot_url: request.screenshotUrl || null,
  };
}

function toSupabaseActivityLogRow(log) {
  return {
    actor_role: log.actorRole || null,
    actor_name: log.actorName || null,
    actor_id:
      log.actorId === undefined || log.actorId === null
        ? null
        : String(log.actorId),
    action: log.action,
    target_type: log.targetType || null,
    target_id:
      log.targetId === undefined || log.targetId === null
        ? null
        : String(log.targetId),
    description: log.description || null,
  };
}

export async function createActivityLog(log) {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .insert(toSupabaseActivityLogRow(log))
      .select();

    if (error) {
      console.error("Failed to create activity log:", getSupabaseErrorMessage(error));
      return null;
    }

    return Array.isArray(data) ? data[0] || null : data;
  } catch (error) {
    console.error("Failed to create activity log:", getSupabaseErrorMessage(error));
    return null;
  }
}

export async function fetchRecentActivityLogs(limit = 20) {
  try {
    const rowLimit = Number(limit) || 20;
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(rowLimit);

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function uploadReloadScreenshotToSupabase(file, memberId) {
  try {
    if (!file) {
      throw new Error("Payment screenshot file is required");
    }

    const bucketName = "reload-screenshots";
    const safeFileName = String(file.name || "payment-screenshot")
      .replace(/[/\\]/g, "-")
      .replace(/\s+/g, "-");
    const filePath = `member-${memberId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(getSupabaseErrorMessage(uploadError));
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Unable to get public URL for uploaded screenshot");
    }

    return {
      screenshotName: file.name,
      screenshotUrl: data.publicUrl,
    };
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function uploadRegistrationProofToSupabase(file, memberId) {
  try {
    if (!file) {
      throw new Error("Registration payment proof file is required");
    }

    const bucketName = "registration-proofs";
    const safeFileName = String(file.name || "registration-payment-proof")
      .replace(/[/\\]/g, "-")
      .replace(/\s+/g, "-");
    const filePath = `member-${memberId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(getSupabaseErrorMessage(uploadError));
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Unable to get public URL for uploaded registration proof");
    }

    return {
      proofName: file.name,
      proofUrl: data.publicUrl,
    };
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true });

    if (error) {
      return {
        success: false,
        error: getSupabaseErrorMessage(error),
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: getSupabaseErrorMessage(error),
    };
  }
}

export async function fetchMembersFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function fetchUsersFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function fetchSessionsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function fetchSessionBookingsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("session_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function fetchSessionWalkinsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("session_walkins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function fetchTransactionsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function fetchReloadRequestsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("reload_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function seedMembersToSupabase(members) {
  try {
    const memberRows = (members || []).map((member) =>
      toSupabaseMemberRow(member)
    );

    const { data, error } = await supabase
      .from("members")
      .upsert(memberRows, { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

async function clearTableByPositiveId(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .gte("id", 0)
    .select();

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  return data || [];
}

export async function clearSupabaseMembers() {
  try {
    return await clearTableByPositiveId("members");
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function clearSupabaseMemberUsers() {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .delete()
      .eq("role", "member")
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function clearSupabaseTransactions() {
  try {
    return await clearTableByPositiveId("transactions");
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function clearSupabaseReloadRequests() {
  try {
    return await clearTableByPositiveId("reload_requests");
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function clearSupabaseSessionBookings() {
  try {
    return await clearTableByPositiveId("session_bookings");
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function clearSupabaseSessionWalkins() {
  try {
    return await clearTableByPositiveId("session_walkins");
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function clearSupabaseActivityLogs() {
  try {
    return await clearTableByPositiveId("activity_logs");
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function clearSupabaseSessions() {
  try {
    return await clearTableByPositiveId("sessions");
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertMemberToSupabase(member) {
  try {
    const { data, error } = await supabase
      .from("members")
      .upsert(toSupabaseMemberRow(member), { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateMemberStatusInSupabase(memberId, status) {
  try {
    const { data, error } = await supabase
      .from("members")
      .update({ status })
      .eq("id", memberId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function seedUsersToSupabase(users) {
  try {
    const userRows = (users || []).map((user) => toSupabaseUserRow(user));

    const { data, error } = await supabase
      .from("app_users")
      .upsert(userRows, { onConflict: "email" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertUserToSupabase(user) {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .upsert(toSupabaseUserRow(user), { onConflict: "email" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateUserByMemberIdInSupabase(memberId, updates) {
  try {
    const supabaseUpdates = {};

    if (Object.prototype.hasOwnProperty.call(updates, "name")) {
      supabaseUpdates.name = updates.name;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      supabaseUpdates.email = updates.email;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "password")) {
      supabaseUpdates.password = updates.password;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "role")) {
      supabaseUpdates.role = updates.role;
    }

    const { data, error } = await supabase
      .from("app_users")
      .update(supabaseUpdates)
      .eq("member_id", memberId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateCurrentUserLoginIdInSupabase(
  memberId,
  newLoginId
) {
  return updateUserByMemberIdInSupabase(memberId, {
    email: newLoginId,
  });
}

export async function updateCurrentUserPasswordInSupabase(
  memberId,
  newPassword
) {
  return updateUserByMemberIdInSupabase(memberId, {
    password: newPassword,
  });
}

export async function seedSessionsToSupabase(sessions) {
  try {
    const sessionRows = (sessions || []).map((session) =>
      toSupabaseSessionRow(session)
    );

    const { data, error } = await supabase
      .from("sessions")
      .upsert(sessionRows, { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertSessionToSupabase(session) {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .upsert(toSupabaseSessionRow(session), { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateSessionInSupabase(sessionId, updates) {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .update(toSupabaseSessionUpdates(updates))
      .eq("id", sessionId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function seedSessionBookingsToSupabase(sessionBookings) {
  try {
    const sessionBookingRows = (sessionBookings || []).map((booking) =>
      toSupabaseSessionBookingRow(booking)
    );

    const { data, error } = await supabase
      .from("session_bookings")
      .upsert(sessionBookingRows, { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertSessionBookingToSupabase(booking) {
  try {
    const { data, error } = await supabase
      .from("session_bookings")
      .upsert(toSupabaseSessionBookingRow(booking), { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateSessionBookingInSupabase(bookingId, updates) {
  try {
    const { data, error } = await supabase
      .from("session_bookings")
      .update(toSupabaseSessionBookingUpdates(updates))
      .eq("id", bookingId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function deleteSessionBookingFromSupabase(bookingId) {
  try {
    const { data, error } = await supabase
      .from("session_bookings")
      .delete()
      .eq("id", bookingId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function seedSessionWalkinsToSupabase(walkins) {
  try {
    const sessionWalkinRows = (walkins || []).map((walkin) =>
      toSupabaseSessionWalkinRow(walkin)
    );

    const { data, error } = await supabase
      .from("session_walkins")
      .upsert(sessionWalkinRows, { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertSessionWalkinToSupabase(walkin) {
  try {
    const { data, error } = await supabase
      .from("session_walkins")
      .upsert(toSupabaseSessionWalkinRow(walkin), { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateSessionWalkinInSupabase(walkinId, updates) {
  try {
    const { data, error } = await supabase
      .from("session_walkins")
      .update(toSupabaseSessionWalkinUpdates(updates))
      .eq("id", walkinId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function deleteSessionWalkinFromSupabase(walkinId) {
  try {
    const { data, error } = await supabase
      .from("session_walkins")
      .delete()
      .eq("id", walkinId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function seedTransactionsToSupabase(transactions) {
  try {
    const transactionRows = (transactions || []).map((transaction) =>
      toSupabaseTransactionRow(transaction)
    );

    const { data, error } = await supabase
      .from("transactions")
      .upsert(transactionRows, { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function seedReloadRequestsToSupabase(reloadRequests) {
  try {
    const reloadRequestRows = (reloadRequests || []).map((request) =>
      toSupabaseReloadRequestRow(request)
    );

    const { data, error } = await supabase
      .from("reload_requests")
      .upsert(reloadRequestRows, { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertReloadRequestToSupabase(request) {
  try {
    const { data, error } = await supabase
      .from("reload_requests")
      .upsert(toSupabaseReloadRequestRow(request), { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateReloadRequestInSupabase(requestId, updates) {
  try {
    const supabaseUpdates = {};

    if (Object.prototype.hasOwnProperty.call(updates, "status")) {
      supabaseUpdates.status = updates.status;
    }

    const { data, error } = await supabase
      .from("reload_requests")
      .update(supabaseUpdates)
      .eq("id", requestId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertTransactionToSupabase(transaction) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .upsert(toSupabaseTransactionRow(transaction), { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function upsertTransactionsToSupabase(transactions) {
  try {
    const transactionRows = (transactions || []).map((transaction) =>
      toSupabaseTransactionRow(transaction)
    );

    const { data, error } = await supabase
      .from("transactions")
      .upsert(transactionRows, { onConflict: "id" })
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}

export async function updateMemberBalanceInSupabase(memberId, balance) {
  try {
    const { data, error } = await supabase
      .from("members")
      .update({ balance: Number(balance || 0) })
      .eq("id", memberId)
      .select();

    if (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }

    return firstRow(data);
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }
}
