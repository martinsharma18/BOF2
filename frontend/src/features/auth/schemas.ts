import { z } from 'zod'
import { ageFrom } from '@/lib/format'

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
  // Optional: province only is enough.
  district: z.string(),
  localLevel: z.string(),
}

/** YYYY-MM-DD from a date input; 16-100 years old. Empty is allowed here and required per account type. */
export const dateOfBirth = z
  .string()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Enter a valid date')
  .refine((v) => {
    if (!v) return true
    const age = ageFrom(v)
    return age >= 16 && age <= 100
  }, 'You must be between 16 and 100 years old')

/** One registration form; the account type radio decides which extra fields are required. */
export const registerSchema = z
  .object({
    accountType: z.enum(['Individual', 'Company']),
    fullName: z.string().trim().min(1, 'Your name is required').max(100),
    email: z.email('Enter a valid email'),
    phoneNumber: phone,
    // Company only
    companyName: z.string().trim().max(150),
    registrationDocument: z.custom<File | null>().optional(),
    // Individual only. An unticked radio group reports null, so allow it here; superRefine requires it for individuals.
    gender: z.enum(['Male', 'Female']).nullish(),
    dateOfBirth,
    socialMediaLink: optionalUrl,
    additionalPhoneNumber: optionalPhone,
    ...location,
    ...passwordPair,
  })
  .refine(matchPasswords, mismatch)
  .superRefine((v, ctx) => {
    if (v.accountType === 'Company' && !v.companyName)
      ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Company name is required' })
    if (v.accountType === 'Company' && !v.registrationDocument)
      ctx.addIssue({ code: 'custom', path: ['registrationDocument'], message: 'Upload a photo of your registration certificate or PAN document' })
    if (v.accountType === 'Individual' && !v.socialMediaLink)
      ctx.addIssue({ code: 'custom', path: ['socialMediaLink'], message: 'Enter your social media link' })
    if (v.accountType === 'Individual' && !v.gender)
      ctx.addIssue({ code: 'custom', path: ['gender'], message: 'Select M or F' })
    if (v.accountType === 'Individual' && !v.dateOfBirth)
      ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Enter your date of birth' })
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
