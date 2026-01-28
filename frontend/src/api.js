import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export async function getPatients() {
  const r = await axios.get(`${API_BASE}/patients`);
  return r.data;
}

export async function runPredict(patientId) {
  const r = await axios.get(`${API_BASE}/predict`, { params: { patient_id: patientId } });
  return r.data;
}
