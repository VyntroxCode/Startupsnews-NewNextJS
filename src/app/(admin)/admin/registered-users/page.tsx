"use client";

import { useCallback, useEffect, useState } from "react";
import { REGISTRATION_CATEGORIES } from "@/constants/registrationCategories";

function categoryLabel(value?: string | null) {
	if (!value) return null;
	return REGISTRATION_CATEGORIES.find((c) => c.value === value)?.label || value;
}

interface RegisteredUser {
	id: number;
	name: string;
	email: string;
	phone?: string;
	city?: string;
	country?: string;
	auth_provider: "email" | "google";
	is_active: boolean;
	created_at: string;
	last_login?: string;
	newsletter_category_slugs?: string | null;
	timezone?: string | null;
	category?: string | null;
	website?: string | null;
}

interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

interface Stats {
	total: number;
	emailCount: number;
	googleCount: number;
	activeToday: number;
}

const AVATAR_COLORS = [
	["#6366f1", "#818cf8"],
	["#ec4899", "#f472b6"],
	["#f59e0b", "#fbbf24"],
	["#10b981", "#34d399"],
	["#3b82f6", "#60a5fa"],
	["#8b5cf6", "#a78bfa"],
	["#ef4444", "#f87171"],
	["#06b6d4", "#22d3ee"],
];

function avatarGradient(name: string) {
	const i = name.charCodeAt(0) % AVATAR_COLORS.length;
	return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
}

function fmt(d?: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function fmtTime(d?: string) {
	if (!d) return "—";
	const date = new Date(d);
	const now = new Date();
	const diff = (now.getTime() - date.getTime()) / 1000;
	if (diff < 60) return "Just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
	return fmt(d);
}

export default function RegisteredUsersPage() {
	const [users, setUsers] = useState<RegisteredUser[]>([]);
	const [pagination, setPagination] = useState<Pagination>({
		page: 1,
		limit: 20,
		total: 0,
		totalPages: 0,
	});
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<"all" | "email" | "google">("all");
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<Stats>({
		total: 0,
		emailCount: 0,
		googleCount: 0,
		activeToday: 0,
	});

	const fetchUsers = useCallback(async (page = 1) => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page: String(page), limit: "50" });
			const res = await fetch(`/api/admin/registered-users?${params}`);
			const d = (await res.json()) as {
				success: boolean;
				data: RegisteredUser[];
				pagination: Pagination;
				stats: Stats;
			};
			if (d.success) {
				setUsers(d.data);
				setPagination(d.pagination);
				setStats(d.stats);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers(1);
	}, [fetchUsers]);

	const filtered = users.filter((u) => {
		const q = search.toLowerCase();
		const matchSearch =
			!q ||
			u.name.toLowerCase().includes(q) ||
			u.email.toLowerCase().includes(q) ||
			(u.country || "").toLowerCase().includes(q) ||
			(u.city || "").toLowerCase().includes(q) ||
			(u.category || "").toLowerCase().includes(q) ||
			(u.phone || "").includes(q);
		const matchFilter = filter === "all" || u.auth_provider === filter;
		return matchSearch && matchFilter;
	});


	const exportCSV = () => {
		const headers = [
			"#",
			"Name",
			"Email",
			"Phone",
			"City",
			"Country",
			"Timezone",
			"Newsletter Categories",
			"Provider",
			"Joined",
			"Last Active",
		];
		const esc = (v: string | number | undefined | null) => {
			const s = String(v ?? "");
			return s.includes(",") || s.includes('"') || s.includes("\n")
				? `"${s.replace(/"/g, '""')}"`
				: s;
		};
		const rows = filtered.map((u, i) =>
			[
				i + 1,
				esc(u.name),
				esc(u.email),
				esc(u.phone),
				esc(u.city),
				esc(u.country),
				esc(u.timezone || ""),
				esc(u.newsletter_category_slugs || ""),
				u.auth_provider,
				u.created_at
					? new Date(u.created_at).toLocaleDateString("en-IN", {
							day: "2-digit",
							month: "short",
							year: "numeric",
						})
					: "",
				u.last_login ? new Date(u.last_login).toLocaleString("en-IN") : "",
			].join(","),
		);
		const csv = "﻿" + [headers.join(","), ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `registered-users-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div>
			{/* ── Header ── */}
			<div style={{ marginBottom: "2.5rem" }}>
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: 16,
						flexWrap: "wrap",
					}}
				>
					<div>
						<h1
							style={{
								fontSize: "2.25rem",
								fontWeight: 700,
								color: "#0f172a",
								margin: "0 0 0.5rem",
								letterSpacing: "-0.02em",
								marginBottom:'1.5rem',
							}}
						>
							Registered Users
						</h1>
						<p style={{ fontSize: "1rem", color: "#64748b", margin: 0 }}>
							Public sign-ups from StartupNews.fyi
						</p>
					</div>

					{/* Search + Export */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							flexShrink: 0,
						}}
					>
						<div style={{ position: "relative" }}>
							<svg
								style={{
									position: "absolute",
									left: 12,
									top: "50%",
									transform: "translateY(-50%)",
									color: "#94a3b8",
								}}
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
							<input
								type="search"
								placeholder="Search name, email, city, country…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{
									padding: "10px 14px 10px 38px",
									borderRadius: 10,
									border: "1.5px solid #e2e8f0",
									fontSize: 14,
									width: 280,
									outline: "none",
									background: "#fff",
									color: "#0f172a",
									boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = "#6366f1";
									e.currentTarget.style.boxShadow =
										"0 0 0 3px rgba(99,102,241,0.1)";
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = "#e2e8f0";
									e.currentTarget.style.boxShadow =
										"0 1px 3px rgba(0,0,0,0.05)";
								}}
							/>
						</div>
						<button
							onClick={exportCSV}
							disabled={loading || filtered.length === 0}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 7,
								padding: "10px 18px",
								borderRadius: 10,
								border: "1.5px solid #10b981",
								background: "#ecfdf5",
								color: "#047857",
								fontWeight: 700,
								fontSize: 13.5,
								cursor: "pointer",
								whiteSpace: "nowrap",
								boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
								opacity: loading || filtered.length === 0 ? 0.5 : 1,
							}}
						>
							<svg
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
								<polyline points="7 10 12 15 17 10" />
								<line x1="12" y1="15" x2="12" y2="3" />
							</svg>
							Export CSV
						</button>
					</div>
				</div>
			</div>

			{/* ── Stat Cards ── */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
					gap: 16,
					marginBottom: "1.75rem",
				}}
			>
				{[
					{
						label: "Total Users",
						value: pagination.total,
						icon: "👥",
						color: "#6366f1",
						bg: "#eef2ff",
					},
					{
						label: "Email Sign-ups",
						value: stats.emailCount,
						icon: "✉️",
						color: "#8b5cf6",
						bg: "#f5f3ff",
					},
					{
						label: "Google Sign-ups",
						value: stats.googleCount,
						icon: "🔵",
						color: "#0ea5e9",
						bg: "#f0f9ff",
					},
					{
						label: "Active Today",
						value: stats.activeToday,
						icon: "🟢",
						color: "#10b981",
						bg: "#ecfdf5",
					},
				].map((card) => (
					<div
						key={card.label}
						style={{
							background: "#fff",
							borderRadius: 14,
							padding: "18px 20px",
							border: "1px solid #e2e8f0",
							boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
							display: "flex",
							alignItems: "center",
							gap: 14,
						}}
					>
						<div
							style={{
								width: 44,
								height: 44,
								borderRadius: 12,
								background: card.bg,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 20,
								flexShrink: 0,
							}}
						>
							{card.icon}
						</div>
						<div>
							<p
								style={{
									fontSize: 22,
									fontWeight: 800,
									color: card.color,
									margin: 0,
									lineHeight: 1,
								}}
							>
								{loading ? "—" : card.value}
							</p>
							<p
								style={{
									fontSize: 12,
									color: "#64748b",
									margin: "3px 0 0",
									fontWeight: 500,
								}}
							>
								{card.label}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* ── Filter Tabs ── */}
			<div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
				{(["all", "email", "google"] as const).map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						style={{
							padding: "7px 18px",
							borderRadius: 8,
							border: "1.5px solid",
							borderColor: filter === f ? "#6366f1" : "#e2e8f0",
							background: filter === f ? "#6366f1" : "#fff",
							color: filter === f ? "#fff" : "#475569",
							fontWeight: 600,
							fontSize: 13,
							cursor: "pointer",
							transition: "all 0.15s",
						}}
					>
						{f === "all"
							? `All (${stats.total})`
							: f === "email"
								? `Email (${stats.emailCount})`
								: `Google (${stats.googleCount})`}
					</button>
				))}
				<div
					style={{
						marginLeft: "auto",
						fontSize: 13,
						color: "#94a3b8",
						alignSelf: "center",
					}}
				>
					{loading
						? "Loading…"
						: `Showing ${filtered.length} of ${pagination.total}`}
				</div>
			</div>

			{/* ── Table ── */}
			<div
				style={{
					background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
					borderRadius: 12,
					border: "1px solid rgba(0,0,0,0.04)",
					overflow: "hidden",
					boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
				}}
			>
				{loading ? (
					<div style={{ padding: "5rem", textAlign: "center" }}>
						<div
							style={{
								width: 36,
								height: 36,
								border: "3px solid #e2e8f0",
								borderTopColor: "#6366f1",
								borderRadius: "50%",
								animation: "spin 0.7s linear infinite",
								margin: "0 auto 12px",
							}}
						/>
						<p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
							Loading users…
						</p>
					</div>
				) : filtered.length === 0 ? (
					<div style={{ padding: "5rem", textAlign: "center" }}>
						<div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
						<p
							style={{
								color: "#64748b",
								fontSize: 15,
								fontWeight: 600,
								margin: "0 0 4px",
							}}
						>
							No users found
						</p>
						<p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
							Try adjusting your search or filter
						</p>
					</div>
				) : (
					<div style={{ overflowX: "auto" }}>
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: 14,
							}}
						>
							<thead>
								<tr
									style={{
										background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
										borderBottom: "1px solid rgba(0,0,0,0.06)",
									}}
								>
									{[
										"#",
										"User",
										"Category",
										"Contact",
										"Location",
										"Timezone",
										"Newsletter",
										"Provider",
										"Joined",
										"Last Active",
									].map((h) => (
										<th
											key={h}
											style={{
												padding: "13px 16px",
												textAlign: "left",
												fontWeight: 700,
												color: "#475569",
												fontSize: 11.5,
												textTransform: "uppercase",
												letterSpacing: "0.06em",
												whiteSpace: "nowrap",
											}}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{filtered.map((u, i) => (
									<tr
										key={u.id}
										style={{
											borderBottom: "1px solid #f1f5f9",
											transition: "background 0.12s",
											cursor: "default",
										}}
										onMouseEnter={(e) =>
											(e.currentTarget.style.background = "#fafbff")
										}
										onMouseLeave={(e) =>
											(e.currentTarget.style.background = "transparent")
										}
									>
										{/* # */}
										<td
											style={{
												padding: "14px 16px",
												color: "#cbd5e1",
												fontWeight: 600,
												fontSize: 12,
												width: 48,
											}}
										>
											{(pagination.page - 1) * pagination.limit + i + 1}
										</td>

										{/* User */}
										<td style={{ padding: "14px 16px", minWidth: 200 }}>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 12,
												}}
											>
												<div
													style={{
														width: 38,
														height: 38,
														borderRadius: "50%",
														background: avatarGradient(u.name),
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														color: "#fff",
														fontWeight: 800,
														fontSize: 15,
														flexShrink: 0,
														boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
													}}
												>
													{u.name.charAt(0).toUpperCase()}
												</div>
												<div>
													<p
														style={{
															margin: 0,
															fontWeight: 700,
															color: "#0f172a",
															fontSize: 14,
														}}
													>
														{u.name}
													</p>
													<p
														style={{
															margin: 0,
															fontSize: 12,
															color: "#94a3b8",
														}}
													>
														ID #{u.id}
													</p>
												</div>
											</div>
										</td>

										{/* Category */}
										<td style={{ padding: "14px 16px", minWidth: 140 }}>
											{categoryLabel(u.category) ? (
												<span
													style={{
														display: "inline-flex",
														padding: "4px 10px",
														borderRadius: 20,
														background: "#eff6ff",
														border: "1px solid #bfdbfe",
														color: "#1d4ed8",
														fontSize: 11.5,
														fontWeight: 700,
														whiteSpace: "nowrap",
													}}
												>
													{categoryLabel(u.category)}
												</span>
											) : (
												<span style={{ color: "#cbd5e1", fontSize: 12 }}>Not set</span>
											)}
											{u.website && (
												<a
													href={u.website}
													target="_blank"
													rel="noopener noreferrer"
													style={{
														display: "block",
														marginTop: 4,
														fontSize: 11.5,
														color: "#94a3b8",
														textDecoration: "none",
														maxWidth: 140,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{u.website.replace(/^https?:\/\//, "")}
												</a>
											)}
										</td>

										{/* Contact */}
										<td style={{ padding: "14px 16px", minWidth: 220 }}>
											<p
												style={{
													margin: "0 0 2px",
													color: "#334155",
													fontWeight: 500,
												}}
											>
												{u.email}
											</p>
											<p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
												{u.phone || "No phone"}
											</p>
										</td>

										{/* Location */}
										<td style={{ padding: "14px 16px", minWidth: 160 }}>
											{u.city || u.country ? (
												<span
													style={{
														display: "inline-flex",
														alignItems: "flex-start",
														gap: 5,
														fontSize: 13,
														color: "#475569",
														fontWeight: 500,
													}}
												>
													🌍
													<span>
														{u.city && (
															<span
																style={{
																	display: "block",
																	fontWeight: 600,
																	color: "#1e293b",
																}}
															>
																{u.city}
															</span>
														)}
														{u.country && (
															<span
																style={{
																	display: "block",
																	color: "#64748b",
																	fontSize: 12,
																}}
															>
																{u.country}
															</span>
														)}
													</span>
												</span>
											) : (
												<span style={{ color: "#cbd5e1", fontSize: 13 }}>
													—
												</span>
											)}
										</td>

										{/* Timezone */}
										<td style={{ padding: "14px 16px", minWidth: 160, whiteSpace: "nowrap" }}>
											{u.timezone ? (
												<span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569", fontWeight: 500 }}>
													<span style={{ fontSize: 14 }}>🕐</span>
													<span>
														<span style={{ display: "block", fontWeight: 600, color: "#1e293b", fontSize: 12 }}>
															{u.timezone.split("/").pop()?.replace(/_/g, " ") ?? u.timezone}
														</span>
														<span style={{ display: "block", color: "#94a3b8", fontSize: 11 }}>
															{u.timezone}
														</span>
													</span>
												</span>
											) : (
												<span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
											)}
										</td>

										{/* Newsletter categories */}
										<td style={{ padding: "14px 16px", minWidth: 200 }}>
											{u.newsletter_category_slugs ? (
												<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
													{u.newsletter_category_slugs.split(",").map((slug) => (
														<span
															key={slug}
															style={{
																padding: "2px 8px",
																borderRadius: 12,
																background: "#ede9fe",
																color: "#6d28d9",
																fontSize: 11,
																fontWeight: 600,
																whiteSpace: "nowrap",
															}}
														>
															{slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
														</span>
													))}
												</div>
											) : (
												<span style={{ color: "#cbd5e1", fontSize: 12 }}>Not set</span>
											)}
										</td>

										{/* Provider */}
										<td style={{ padding: "14px 16px" }}>
											{u.auth_provider === "google" ? (
												<span
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 6,
														padding: "4px 12px",
														borderRadius: 20,
														background: "#fff7ed",
														border: "1px solid #fed7aa",
														color: "#c2410c",
														fontSize: 12,
														fontWeight: 700,
													}}
												>
													<svg
														width="12"
														height="12"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<path
															d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
															fill="#4285F4"
														/>
														<path
															d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
															fill="#34A853"
														/>
														<path
															d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
															fill="#FBBC05"
														/>
														<path
															d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
															fill="#EA4335"
														/>
													</svg>
													Google
												</span>
											) : (
												<span
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 6,
														padding: "4px 12px",
														borderRadius: 20,
														background: "#f5f3ff",
														border: "1px solid #ddd6fe",
														color: "#6d28d9",
														fontSize: 12,
														fontWeight: 700,
													}}
												>
													✉ Email
												</span>
											)}
										</td>

										{/* Joined */}
										<td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
											<p
												style={{
													margin: 0,
													color: "#334155",
													fontSize: 13,
													fontWeight: 500,
												}}
											>
												{fmt(u.created_at)}
											</p>
										</td>

										{/* Last Active */}
										<td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
											{u.last_login ? (
												<span
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 5,
														fontSize: 13,
														color: "#10b981",
														fontWeight: 600,
													}}
												>
													<span
														style={{
															width: 7,
															height: 7,
															borderRadius: "50%",
															background: "#10b981",
															display: "inline-block",
														}}
													/>
													{fmtTime(u.last_login)}
												</span>
											) : (
												<span style={{ fontSize: 13, color: "#cbd5e1" }}>
													Never
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* ── Pagination ── */}
			{pagination.totalPages > 1 && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 6,
						marginTop: "1.5rem",
					}}
				>
					<button
						onClick={() => fetchUsers(pagination.page - 1)}
						disabled={pagination.page === 1}
						style={{
							padding: "8px 16px",
							borderRadius: 9,
							border: "1.5px solid #e2e8f0",
							background: "#fff",
							color: pagination.page === 1 ? "#cbd5e1" : "#475569",
							fontWeight: 600,
							fontSize: 13,
							cursor: pagination.page === 1 ? "not-allowed" : "pointer",
						}}
					>
						← Prev
					</button>

					{Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
						(p) => (
							<button
								key={p}
								onClick={() => fetchUsers(p)}
								style={{
									width: 38,
									height: 38,
									borderRadius: 9,
									border: "1.5px solid",
									borderColor: pagination.page === p ? "#6366f1" : "#e2e8f0",
									background: pagination.page === p ? "#6366f1" : "#fff",
									color: pagination.page === p ? "#fff" : "#475569",
									fontWeight: 700,
									fontSize: 13,
									cursor: "pointer",
								}}
							>
								{p}
							</button>
						),
					)}

					<button
						onClick={() => fetchUsers(pagination.page + 1)}
						disabled={pagination.page === pagination.totalPages}
						style={{
							padding: "8px 16px",
							borderRadius: 9,
							border: "1.5px solid #e2e8f0",
							background: "#fff",
							color:
								pagination.page === pagination.totalPages
									? "#cbd5e1"
									: "#475569",
							fontWeight: 600,
							fontSize: 13,
							cursor:
								pagination.page === pagination.totalPages
									? "not-allowed"
									: "pointer",
						}}
					>
						Next →
					</button>
				</div>
			)}

			<style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
		</div>
	);
}
