import { z } from 'zod'

export const phone = z.string().trim().regex(/^\+?[0-9\s-]{7,15}$/, 'Enter a valid phone number')
export const optionalPhone = z.union([z.literal(''), phone])
export const optionalUrl = z.union([
  z.literal(''),
  z.url({ protocol: /^https?$/, error: 'Enter a full link starting with https://' }),
])

export const newPassword = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number')

const passwordPair = { password: newPassword, confirmPassword: z.string().min(1, 'Please repeat the password') }
const matchPasswords = <T extends { password: string; confirmPassword: string }>(v: T) =>
  v.password === v.confirmPassword
const mismatch = { path: ['confirmPassword'], message: 'Passwords do not match' }

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginValues = z.infer<typeof loginSchema>

const location = {
  province: z.string().min(1, 'Select a province'),
  district: z.string().min(1, 'Select a district'),
}

/** One registration form; the account type radio decides which extra fields are required. */
export const registerSchema = z
  .object({
    accountType: z.enum(['Individual', 'Company']),
    fullName: z.string().trim().min(1, 'Your name is required').max(100),
    email: z.email('Enter a valid email'),
    phoneNumber: phone,
    // Company only
    companyName: z.string().trim().max(150),
    // Individual only. An unticked radio group reports null, so allow it here; superRefine requires it for individuals.
    gender: z.enum(['Male', 'Female']).nullish(),
    socialMediaLink: optionalUrl,
    additionalPhoneNumber: optionalPhone,
    ...location,
    ...passwordPair,
  })
  .refine(matchPasswords, mismatch)
  .superRefine((v, ctx) => {
    if (v.accountType === 'Company' && !v.companyName)
      ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Company name is required' })
    if (v.accountType === 'Individual' && !v.gender)
      ctx.addIssue({ code: 'custom', path: ['gender'], message: 'Select M or F' })
  })
export type RegisterValues = z.infer<typeof registerSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword,
    confirmPassword: z.string().min(1, 'Please repeat the password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, mismatch)
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
