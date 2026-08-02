import { NextRequest, NextResponse } from "next/server";

const BACKEND = "https://institute-api.rhaitech.online/arise/api" || 'https://institute-api.rhaitech.online/arise/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    try {
      const res = await fetch(`${BACKEND}/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
      console.error("Backend /auth/send-otp call failed:", err);
      return NextResponse.json(
        { success: false, message: "Backend service connection error" },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

