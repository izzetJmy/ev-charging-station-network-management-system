import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export type ReportIssueType =
  | "charger_not_working"
  | "wrong_price"
  | "station_offline"
  | "location_problem"
  | "payment_problem"
  | "other";

export interface ReportInput {
  stationId: string;
  chargerId: string | null;
  issueType: ReportIssueType;
  description: string;
}

export async function createReport(report: ReportInput) {
  const reportRef = await addDoc(collection(db, "reports"), {
    stationId: report.stationId,
    chargerId: report.chargerId,
    issueType: report.issueType,
    description: report.description,
    createdAt: serverTimestamp(),
  });

  return reportRef.id;
}
