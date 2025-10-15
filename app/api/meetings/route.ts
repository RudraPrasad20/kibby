// app/api/meetings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSlug } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  const type = searchParams.get('type') // 'creator' or 'all'

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
  }

  try {
    let meetings
    if (type === 'creator') {
      meetings = await db.meeting.findMany({
        where: { creatorWallet: wallet },
        include: { bookings: true },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json(meetings)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, duration, price, creatorWallet, imageUrl } = body

    if (!title || !duration || !price || !creatorWallet) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const slug = generateSlug(title)

    const meeting = await db.meeting.create({
      data: {
        title,
        description,
        duration,
        price,
        creatorWallet,
        slug,
        imageUrl
      }
    })

    return NextResponse.json(meeting)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}