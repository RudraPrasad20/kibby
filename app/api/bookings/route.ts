// app/api/bookings/route.ts (no major changes; added comment for webhook integration)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
  }

  try {
    const bookings = await db.booking.findMany({
      where: { userWallet: wallet },
      include: { 
        meeting: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true
          }
        }
      },
      orderBy: { bookedAt: 'desc' }  // Note: Ensure Prisma has bookedAt or map to createdAt
    })

    // console.log('Bookings API response:', bookings)

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error in /api/bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { meetingId, userWallet, transactionSig } = body

    if (!meetingId || !userWallet || !transactionSig) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const booking = await db.booking.create({
      data: {
        meetingId,
        userWallet,
        transactionSig,
        status: 'confirmed'
      },
      include: { 
        meeting: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true
          }
        }
      }
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

// Note: For webhook updates (e.g., from Helius), add a PUT route like:
// export async function PUT(request: NextRequest) {
//   const { id, status, transactionSig } = await request.json();
//   const booking = await db.booking.update({ where: { id }, data: { status, transactionSig } });
//   return NextResponse.json(booking);
// }