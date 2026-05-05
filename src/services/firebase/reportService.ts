import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
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

export interface ReportRecord extends ReportInput {
  id: string;
  createdAt?: Timestamp;
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

export async function getReports(): Promise<ReportRecord[]> {
  const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<ReportRecord, "id">;
    return { id: docSnap.id, ...data };
  });
}
