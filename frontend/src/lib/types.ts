export type AccountType = 'Company' | 'Individual' | 'Admin'
export type Gender = 'Male' | 'Female'
export type PostType = 'Type1' | 'Type2'
export type PostOption = 'A' | 'B'
export type ReactionType = 'Like' | 'Love' | 'Haha' | 'Wow' | 'Sad'
export type AdPlacement = 'Banner' | 'Sidebar'

export interface User {
  id: string
  email: string
  fullName: string
  accountType: AccountType
  companyName: string | null
  avatarUrl: string | null
}

export interface AuthResponse {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  user: User
}

export interface Province {
  name: string
  districts: string[]
  /** District name → its local levels (municipalities / rural municipalities). */
  localLevels: Record<string, string[]>
}

export interface Author {
  id: string
  fullName: string
  accountType: AccountType
  companyName: string | null
  avatarUrl: string | null
  displayName: string
}

export interface Post {
  id: string
  type: PostType
  /** Type 1 only; null on Type 2 and older Type 1 posts. */
  option: PostOption | null
  title: string
  mediaUrl: string | null
  acceptsMale: boolean
  acceptsFemale: boolean
  minimumNumber: number
  maximumPayment: number
  contactNumber: string | null
  witnessContactNumber: string | null
  isFromAnywhere: boolean
  province: string | null
  district: string | null
  localLevel: string | null
  requirement: string
  createdAt: string
  updatedAt: string | null
  author: Author
  reactionCounts: Partial<Record<ReactionType, number>>
  myReaction: ReactionType | null
  feedbackCount: number
  applicationCount: number
  /** Most applications this post takes (Type 1: people needed × 5); null = no limit. */
  applicationLimit: number | null
  /** Limit reached: hidden from the feed (except for its company and admins) and no new applications. */
  isClosed: boolean
  myApplication: MyApplication | null
}

export interface MyApplication {
  id: string
  status: ApplicationStatus
  /** Open payment claim waiting for the company; null when none. */
  claimedAmount: number | null
  paidAmount: number
  claimDeclineReason: string | null
}

export type ApplicationKind = 'Apply' | 'Claim'
/** Pending (applied) → Accepted (hired) → Completed (paid). Rejected = declined. */
export type ApplicationStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Completed'

export interface Applicant {
  id: string
  fullName: string
  avatarUrl: string | null
  gender: Gender | null
  province: string | null
  district: string | null
  localLevel: string | null
  /** YYYY-MM-DD */
  dateOfBirth: string | null
  email: string | null
  phoneNumber: string | null
  additionalPhoneNumber: string | null
  socialMediaLink: string | null
  bio: string | null
  joinedAt: string
}

export interface Application {
  id: string
  postId: string
  postTitle: string
  postType: PostType
  postMaximumPayment: number
  kind: ApplicationKind
  status: ApplicationStatus
  message: string
  createdAt: string
  updatedAt: string | null
  applicant: Applicant
  company: Author
  messageCount: number
  paidAmount: number
  claimedAmount: number | null
  claimNote: string | null
  claimedAt: string | null
  claimAttachmentUrl: string | null
  claimAttachmentName: string | null
  /** Why the company turned down the last claim. Cleared when the applicant claims again. */
  claimDeclineReason: string | null
}

export interface ApplicationMessage {
  id: string
  applicationId: string
  content: string
  createdAt: string
  sender: Author
}

/** One conversation in Messages. Every application is a chat that starts with the application message. */
export interface ChatSummary {
  applicationId: string
  postId: string
  postTitle: string
  status: ApplicationStatus
  claimedAmount: number | null
  /** The applicant (for companies) or the company (for individuals). */
  other: Author
  lastMessage: string
  lastFromMe: boolean
  lastAt: string
  unread: number
}

export interface ApplicationPost {
  postId: string
  title: string
  total: number
  new: number
  toPay: number
}

export type NotificationType =
  | 'VacancyApplicationAccepted'
  | 'VacancyApplicationRejected'
  | 'ApplicationReceived'
  | 'ApplicationAccepted'
  | 'ApplicationRejected'
  | 'NewMessage'
  | 'PaymentReceived'
  | 'WithdrawalRequested'
  | 'WithdrawalPaid'
  | 'WithdrawalRejected'
  | 'PaymentClaimed'
  | 'Invitation'
  | 'ClaimDeclined'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  createdAt: string
  /** Who caused it; null for system messages. */
  actor: Author | null
}

export type WithdrawalStatus = 'Pending' | 'Paid' | 'Rejected'

export interface Payment {
  id: string
  amount: number
  note: string | null
  createdAt: string
  payer: Author
  postId: string
  postTitle: string
}

export interface Withdrawal {
  id: string
  amount: number
  bankName: string
  accountName: string
  accountNumber: string
  status: WithdrawalStatus
  adminNote: string | null
  createdAt: string
  processedAt: string | null
  user: Author
}

export interface Wallet {
  balance: number
  totalEarned: number
  pendingWithdrawal: number
  totalWithdrawn: number
  recentPayments: Payment[]
  withdrawals: Withdrawal[]
}

export interface PostFilters {
  search?: string
  type?: PostType
  province?: string
  district?: string
  localLevel?: string
  authorId?: string
}

export interface ReactionSummary {
  reactionCounts: Partial<Record<ReactionType, number>>
  myReaction: ReactionType | null
}

export interface Feedback {
  id: string
  postId: string
  content: string
  createdAt: string
  author: Author
}

export interface PublicProfile {
  id: string
  fullName: string
  accountType: AccountType
  companyName: string | null
  avatarUrl: string | null
  bio: string | null
  province: string | null
  district: string | null
  localLevel: string | null
  socialMediaLink: string | null
  gender: Gender | null
  age: number | null
  joinedAt: string
  postCount: number
}

export interface MyProfile {
  profile: PublicProfile
  email: string
  phoneNumber: string | null
  additionalPhoneNumber: string | null
  /** YYYY-MM-DD */
  dateOfBirth: string | null
}

export interface Ad {
  id: string
  title: string
  description: string | null
  imageUrl: string
  linkUrl: string | null
  placement: AdPlacement
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  companies: number
  individuals: number
  newUsersLast7Days: number
  totalPosts: number
  postsLast7Days: number
  totalReactions: number
  totalFeedback: number
  activeAds: number
  totalApplications: number
  pendingWithdrawals: number
  pendingWithdrawalAmount: number
  totalPaidOut: number
}

export interface AdminUser {
  id: string
  fullName: string
  email: string
  phoneNumber: string | null
  accountType: AccountType
  companyName: string | null
  isDisabled: boolean
  createdAt: string
  postCount: number
  registrationDocumentUrl: string | null
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
}

export interface ProblemDetails {
  title?: string
  status?: number
  errors?: Record<string, string[]>
}

export interface Invitation {
  id: string
  title: string
  message: string
  postId: string | null
  postTitle: string | null
  province: string | null
  district: string | null
  localLevel: string | null
  gender: Gender | null
  minAge: number | null
  maxAge: number | null
  recipientCount: number
  createdAt: string
}

export interface Vacancy {
  id: string
  title: string
  organization: string
  location: string
  description: string
  howToApply: string | null
  /** YYYY-MM-DD */
  deadline: string | null
  isActive: boolean
  createdAt: string
  /** Admin list only (0 elsewhere). */
  applicationCount: number
  pendingApplicationCount: number
}

export type VacancyApplicationStatus = 'Pending' | 'Accepted' | 'Rejected'

export interface MyVacancyApplication {
  id: string
  status: VacancyApplicationStatus
  createdAt: string
}

export interface VacancyApplication {
  id: string
  vacancyId: string
  vacancyTitle: string
  applicantId: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string | null
  applicantAvatarUrl: string | null
  cvUrl: string
  cvFileName: string
  note: string | null
  status: VacancyApplicationStatus
  createdAt: string
  reviewedAt: string | null
}

export type InboxItemKind = 'Invitation' | 'Vacancy'

export interface InboxItem {
  id: string
  kind: InboxItemKind
  isRead: boolean
  createdAt: string
  /** The inviting company; null means the super admin (vacancies). */
  sender: Author | null
  subject: string
  preview: string
  invitation: { message: string; postId: string | null; postTitle: string | null } | null
  vacancy: Vacancy | null
}
