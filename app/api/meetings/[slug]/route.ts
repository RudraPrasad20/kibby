// app/api/meetings/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 })
  }

  try {
    const meeting = await db.meeting.findUnique({
      where: { slug },
      include: { 
        bookings: true
      }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 })
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 401 })
    }

    const meeting = await db.meeting.findUnique({
      where: { slug }
    })

    if (!meeting || meeting.creatorWallet !== wallet) {
      return NextResponse.json({ error: 'Not authorized to delete this meeting' }, { status: 403 })
    }

    await db.meeting.delete({
      where: { slug }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete meeting error:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}