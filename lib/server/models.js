export function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function fromPlayerRow(row) {
  return {
    id: row.id,
    personId: row.person_id,
    role: "player",
    name: row.name,
    photo: row.photo,
    email: row.email,
    mobile: row.mobile,
    jerseyNumber: row.jersey_number,
    jerseySize: row.jersey_size,
    jerseyName: row.jersey_name,
    village: row.village,
    password: row.password,
    feePaid: row.fee_paid,
    paymentRef: row.payment_ref,
    registeredAt: row.registered_at
  };
}

export function toPlayerRow(player) {
  return {
    id: player.id,
    person_id: player.personId,
    role: "player",
    name: player.name,
    photo: player.photo,
    email: player.email,
    mobile: player.mobile,
    jersey_number: player.jerseyNumber,
    jersey_size: player.jerseySize,
    jersey_name: player.jerseyName,
    village: player.village,
    password: player.password,
    fee_paid: player.feePaid,
    payment_ref: player.paymentRef,
    registered_at: player.registeredAt
  };
}

export function fromTeamOwnerRow(row) {
  return {
    id: row.id,
    personId: row.person_id,
    role: "team_owner",
    ownerName: row.owner_name,
    teamName: row.team_name,
    logo: row.logo,
    jerseyDesign: row.jersey_design,
    email: row.email,
    jerseyPattern: row.jersey_pattern,
    ownerMobile: row.owner_mobile,
    password: row.password,
    feePaid: row.fee_paid,
    paymentRef: row.payment_ref,
    registeredAt: row.registered_at
  };
}

export function toTeamOwnerRow(owner) {
  return {
    id: owner.id,
    person_id: owner.personId,
    role: "team_owner",
    owner_name: owner.ownerName,
    team_name: owner.teamName,
    logo: owner.logo,
    jersey_design: owner.jerseyDesign,
    email: owner.email,
    jersey_pattern: owner.jerseyPattern,
    owner_mobile: owner.ownerMobile,
    password: owner.password,
    fee_paid: owner.feePaid,
    payment_ref: owner.paymentRef,
    registered_at: owner.registeredAt
  };
}

export function fromSuperAdminRow(row) {
  return {
    id: row.id,
    personId: row.person_id,
    role: "super_admin",
    name: row.name,
    email: row.email,
    password: row.password,
    createdAt: row.created_at
  };
}

export function toSuperAdminRow(admin) {
  return {
    id: admin.id,
    person_id: admin.personId,
    role: "super_admin",
    name: admin.name,
    email: admin.email,
    password: admin.password,
    created_at: admin.createdAt
  };
}

