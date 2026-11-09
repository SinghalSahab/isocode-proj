import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireUser("desk");

    const aliases = await prisma.retailerAlias.findMany({
      include: {
        retailer: {
          select: { id: true, shopName: true, ownerName: true, phone: true },
        },
        sku: {
          select: { id: true, code: true, nameEn: true },
        },
      },
      orderBy: { lastUsedAt: "desc" },
    });

    return NextResponse.json({ aliases });
  } catch (error) {
    console.error("Error in aliases GET:", error);
    return NextResponse.json({ error: "ALIASES_FETCH_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireUser("desk");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    await prisma.retailerAlias.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alias:", error);
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}

