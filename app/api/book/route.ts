import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await db.bookingDetails.create({
      data: {
        date_time: body.date_time,
        name: body.name,
        email: body.email,
        wallet: body.wallet,
        description: body.description,
      },
    });

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json("catch error", { status: 400 });
  }
}
