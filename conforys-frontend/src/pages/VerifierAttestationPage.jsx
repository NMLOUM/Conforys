import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import api from "../api/axios";

// Page PUBLIQUE — aucune authentification requise. Sert à vérifier
// l'authenticité d'une attestation en scannant le QR code de son PDF.
function VerifierAttestationPage() {
  const { code } = useParams();
  const [resultat,   setResultat]   = useState(null); // données de vérification, ou "introuvable"
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    document.title = "CONFORYS — Vérification d'attestation";
  }, []);

  useEffect(() => {
    api.get(`/attestations/verifier/${code}`)
      .then((r) => setResultat(r.data.data))
      .catch(() => setResultat("introuvable"))
      .finally(() => setChargement(false));
  }, [code]);

  const introuvable = resultat === "introuvable";
  const expiree = resultat && resultat !== "introuvable" && !resultat.valide;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-xl font-bold text-navy tracking-wide" translate="no">CONFORYS</span>
            <span className="text-[10px] font-semibold text-vert bg-vert/15 px-1.5 py-0.5 rounded uppercase tracking-wider">QHSE</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1E293B]">Vérification d'attestation</h1>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-7 text-center">
          {chargement ? (
            <p className="text-sm text-[#64748B]">Vérification en cours...</p>
          ) : introuvable ? (
            <>
              <XCircle size={40} color="#DC2626" strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-base font-semibold" style={{ color: "#DC2626" }}>Attestation introuvable</p>
              <p className="text-sm text-[#64748B] mt-1.5">
                Aucune attestation ne correspond à ce code de vérification.
              </p>
            </>
          ) : expiree ? (
            <>
              <AlertTriangle size={40} color="#EA580C" strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-base font-semibold" style={{ color: "#EA580C" }}>Attestation expirée</p>
              <div className="mt-4 pt-4 border-t border-[#F1F5F9] text-left space-y-1.5">
                <p className="text-sm text-[#1E293B]"><span className="font-semibold">Bénéficiaire :</span> {resultat.beneficiaire}</p>
                <p className="text-sm text-[#1E293B]"><span className="font-semibold">Formation :</span> {resultat.titreFormation}</p>
                <p className="text-sm text-[#1E293B]">
                  <span className="font-semibold">Expirée depuis le :</span> {new Date(resultat.dateExpiration).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 size={40} color="#2E7D32" strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-base font-semibold" style={{ color: "#2E7D32" }}>Attestation valide</p>
              <div className="mt-4 pt-4 border-t border-[#F1F5F9] text-left space-y-1.5">
                <p className="text-sm text-[#1E293B]"><span className="font-semibold">Bénéficiaire :</span> {resultat.beneficiaire}</p>
                <p className="text-sm text-[#1E293B]"><span className="font-semibold">Formation :</span> {resultat.titreFormation}</p>
                <p className="text-sm text-[#1E293B]">
                  <span className="font-semibold">Obtenue le :</span> {new Date(resultat.dateObtention).toLocaleDateString("fr-FR")}
                </p>
                {resultat.dateExpiration && (
                  <p className="text-sm text-[#1E293B]">
                    <span className="font-semibold">Valide jusqu'au :</span> {new Date(resultat.dateExpiration).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifierAttestationPage;
