import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL 
  ? `${process.env.BACKEND_URL.replace(/\/$/, "")}/api` 
  : (process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, otpToken } = body;

    if (!email || !otp || !otpToken) {
      return NextResponse.json(
        { success: false, message: "Email, OTP, and token are required" },
        { status: 400 }
      );
    }

    try {
      const res = await fetch(`${BACKEND}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp, otpToken }),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
      console.error("Backend /auth/verify-otp call failed:", err);
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
