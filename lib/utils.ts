// import { clsx, type ClassValue } from "clsx"
// import { twMerge } from "tailwind-merge"

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }


// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import slugify from 'slugify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(title: string): string {
  return slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36)
}

export function generateBlinkUrl(baseUrl: string, meetingId: string): string {
  return `${baseUrl}/api/actions/book-meeting?meetingId=${meetingId}`;
}