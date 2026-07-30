import { NextRequest, NextResponse } from "next/server";

// ✅ Always keep base URL only (NO /api here)
const BACKEND = process.env.BACKEND_URL 
  ? `${process.env.BACKEND_URL.replace(/\/$/, "")}/api` 
  : (process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ✅ Validate required fields
    const { studentName, studentContact, parentContact } = body;

    if (!studentName || !studentContact || !parentContact) {
      return NextResponse.json(
        { success: false, message: "Required fields are missing" },
        { status: 400 }
      );
    }

    // ✅ Map frontend → backend payload
    const inquiryPayload = {
      name: studentName,
      phone: studentContact,
      father_name: body.fatherName || "",
      father_phone: parentContact,
      course: "",
      location: body.location || "",
      board: body.batch || "", // Board is captured under batch in the form state
      standard: body.standard || "",
      status: "New",
      video: "",
      dob: body.dob || "",
      email: body.email || "",
      address: body.address || "",
      college_name: body.collegeName || "",
      college_timing: body.collegeTiming || "",
      last_exam_marks: body.lastExamMarks || "",
      father_occupation: body.fatherOccupation || "",
      mother_occupation: body.motherOccupation || "",
      future_plans: body.futurePlans || "",
      reference: body.reference || "",
      sibling_name: body.siblingName || "",
      sex: body.sex || "",
      taking_coaching: body.takingCoaching || "",
      hostel_required: body.hostelRequired || "",
    };

    // ✅ Correct backend call
    const res = await fetch(`${BACKEND}/inquiries/public`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inquiryPayload),
    });

    // ✅ Handle non-JSON safely
    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid response from backend" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: res.status });

  } catch (err: any) {
    console.error("Inquiry API ERROR:", err.message);

    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}