import { useState, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";
import { useRole } from "../hooks/useRole";
import Badge from "../components/ui/Badge";
import { incidentSchema } from "../validators/incidentSchema";

// ── Données statiques ────────────────────────────────────────────────────────

const ETAPES_WIZARD = [
  { num: 1, label: "Type",          champs: ["type"] },
  { num: 2, label: "Description",   champs: ["dateIncident", "siteId", "description", "gravite"] },
  { num: 3, label: "Médias",        champs: [] },
  { num: 4, label: "Confirmation",  champs: [] },
];

const CONFIGS_TYPE = [
  { value: "ACCIDENT",                 label: "Accident",                 desc: "Blessure physique survenue sur une personne" },
  { value: "PRESQU_ACCIDENT",          label: "Presqu'accident",          desc: "Événement sans blessure mais à fort potentiel" },
  { value: "SITUATION_DANGEREUSE",     label: "Situation dangereuse",     desc: "Condition pouvant provoquer un accident" },
  { value: "INCIDENT_ENVIRONNEMENTAL", label: "Incident environnemental", desc: "Impact direct sur l'environnement naturel" },
];

const CONFIGS_GRAVITE = [
  { value: "FAIBLE",   label: "Faible",   color: "#2E7D32", bg: "#F0FDF4" },
  { value: "MOYEN",    label: "Moyen",    color: "#92400E", bg: "#FFFBEB" },
  { value: "GRAVE",    label: "Grave",    color: "#EA580C", bg: "#FFF7ED" },
  { value: "CRITIQUE", label: "Critique", color: "#DC2626", bg: "#FEF2F2" },
];

const LABELS_TYPE = Object.fromEntries(CONFIGS_TYPE.map((c) => [c.value, c.label]));

// ── Indicateur de progression ────────────────────────────────────────────────

function StepperIndicateur({ etape }) {
  return (
    <div className="flex items-start">
      {ETAPES_WIZARD.map((info, i) => {
        const done   = info.num < etape;
        const active = info.num === etape;
        return (
          <Fragment key={info.num}>
            <div className="flex flex-col items-center" style={{ minWidth: "60px" }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: done ? "#2E7D32" : active ? "#0D2B4E" : "#F1F5F9",
                  color: done || active ? "white" : "#94A3B8",
                }}
              >
                {done ? "✓" : info.num}
              </div>
              <span
                className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-center"
                style={{ color: active ? "#0D2B4E" : done ? "#2E7D32" : "#94A3B8" }}
              >
                {info.label}
              </span>
            </div>
            {i < ETAPES_WIZARD.length - 1 && (
              <div
                className="flex-1 h-px mt-4 transition-colors"
                style={{ backgroundColor: done ? "#2E7D32" : "#E2E8F0" }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Étape 1 — Type d'incident ────────────────────────────────────────────────

function Etape1({ valeurs, setValue, errors }) {
  return (
    <div className="pt-1">
      <p className="text-sm text-[#64748B] mb-4">Sélectionnez le type d'incident à déclarer.</p>
      <div className="grid grid-cols-2 gap-3">
        {CONFIGS_TYPE.map(({ value, label, desc }) => {
          const selected = valeurs.type === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setValue("type", value, { shouldValidate: true })}
              className="text-left p-4 rounded-lg border-2 transition-all"
              style={{
                borderColor: selected ? "#0D2B4E" : "#E2E8F0",
                backgroundColor: selected ? "rgba(13, 43, 78, 0.04)" : "white",
              }}
            >
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: selected ? "#0D2B4E" : "#1E293B" }}
              >
                {label}
              </p>
              <p className="text-xs text-[#64748B] leading-relaxed">{desc}</p>
            </button>
          );
        })}
      </div>
      {errors.type && (
        <p className="mt-3 text-xs text-[#DC2626]">{errors.type.message}</p>
      )}
    </div>
  );
}

// ── Étape 2 — Description ────────────────────────────────────────────────────

function Etape2({ valeurs, setValue, errors, register, sites }) {
  const inputCls = (name) =>
    `w-full px-3 py-2.5 text-sm border rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8]
     focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition ${
      errors[name] ? "border-[#DC2626]" : "border-[#E2E8F0]"
    }`;

  return (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
            Date et heure *
          </label>
          <input
            type="datetime-local"
            {...register("dateIncident")}
            className={inputCls("dateIncident")}
          />
          {errors.dateIncident && (
            <p className="mt-1 text-xs text-[#DC2626]">{errors.dateIncident.message}</p>
          )}
        </div>
        <div>
          <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
            Site *
          </label>
          <select {...register("siteId")} className={inputCls("siteId")}>
            <option value="">— Choisir un site —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
          {errors.siteId && (
            <p className="mt-1 text-xs text-[#DC2626]">{errors.siteId.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
          Lieu précis
        </label>
        <input
          type="text"
          {...register("adresseLisible")}
          placeholder="ex : Atelier A, Zone nord"
          className={inputCls("adresseLisible")}
        />
      </div>

      <div>
        <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
          Description *
        </label>
        <textarea
          {...register("description")}
          rows={4}
          placeholder="Décrivez l'incident avec précision (min. 10 caractères)…"
          className={`${inputCls("description")} resize-none`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-[#DC2626]">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="block mb-2 text-xs font-semibold text-[#475569] uppercase tracking-wide">
          Gravité *
        </label>
        <div className="flex gap-2">
          {CONFIGS_GRAVITE.map(({ value, label, color, bg }) => {
            const selected = valeurs.gravite === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue("gravite", value, { shouldValidate: true })}
                className="flex-1 py-2 px-3 rounded-md text-sm font-semibold border-2 transition-all"
                style={
                  selected
                    ? { borderColor: color, backgroundColor: bg, color }
                    : { borderColor: "#E2E8F0", backgroundColor: "white", color: "#94A3B8" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        {errors.gravite && (
          <p className="mt-1 text-xs text-[#DC2626]">{errors.gravite.message}</p>
        )}
      </div>
    </div>
  );
}

// ── Étape 3 — Photo & Géolocalisation ────────────────────────────────────────

function IcôneCible() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-[#0D2B4E] border-t-transparent rounded-full animate-spin shrink-0" />
  );
}

function Etape3({ media, onChange }) {
  const [uploading,     setUploading]     = useState(false);
  const [uploadErreur,  setUploadErreur]  = useState("");
  const [apercu,        setApercu]        = useState("");   // blob URL pour l'aperçu local
  const [geoChargement, setGeoChargement] = useState(false);
  const [geoErreur,     setGeoErreur]     = useState("");

  const set = (key, val) => onChange((prev) => ({ ...prev, [key]: val }));

  // ── Upload vers ImgBB ──
  const handleFichier = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    // Aperçu immédiat avant upload
    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(URL.createObjectURL(fichier));
    setUploadErreur("");
    set("photoUrl", "");

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", fichier);

      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
        { method: "POST", body: fd }
      );
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message || "Réponse ImgBB invalide.");
      }
      set("photoUrl", json.data.url);
    } catch (err) {
      setUploadErreur(
        err.message.includes("fetch")
          ? "Impossible de joindre ImgBB. Vérifiez votre connexion."
          : (err.message || "Échec de l'envoi. Réessayez.")
      );
      setApercu("");
    } finally {
      setUploading(false);
    }
  };

  // ── Géolocalisation navigateur ──
  const localiser = () => {
    if (!navigator.geolocation) {
      setGeoErreur("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    setGeoChargement(true);
    setGeoErreur("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude",  pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        setGeoChargement(false);
      },
      (err) => {
        const MSG = {
          1: "Accès refusé. Autorisez la localisation dans les paramètres du navigateur.",
          2: "Position indisponible. Vérifiez votre signal GPS.",
          3: "Délai expiré. Réessayez en extérieur ou près d'une fenêtre.",
        };
        setGeoErreur(MSG[err.code] || "Erreur de géolocalisation.");
        setGeoChargement(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const positionOk = media.latitude && media.longitude;

  return (
    <div className="space-y-6 pt-1">

      {/* ── Photo ── */}
      <div>
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
          Photo de l'incident{" "}
          <span className="font-normal normal-case text-[#94A3B8]">(facultatif)</span>
        </p>

        {/* Zone de sélection / capture */}
        <label
          className="flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors select-none"
          style={{
            borderColor: apercu && media.photoUrl ? "#0D2B4E" : "#E2E8F0",
            backgroundColor: apercu && media.photoUrl ? "rgba(13,43,78,0.03)" : "#FAFAFA",
          }}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFichier}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <Spinner />
              Envoi de la photo…
            </div>
          ) : apercu && media.photoUrl ? (
            <span className="text-sm font-medium text-[#0D2B4E]">
              Photo envoyée — cliquer pour changer
            </span>
          ) : (
            <span className="text-sm text-[#64748B]">
              Sélectionner ou prendre une photo
            </span>
          )}
        </label>

        {/* Aperçu miniature */}
        {apercu && (
          <div className="mt-3 relative inline-block">
            <img
              src={apercu}
              alt="Aperçu"
              className="h-28 rounded-md object-cover border border-[#E2E8F0]"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-md">
                <div className="w-5 h-5 border-2 border-[#0D2B4E] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {uploadErreur && (
          <p className="mt-2 text-xs text-[#DC2626]">{uploadErreur}</p>
        )}
        {media.photoUrl && !uploading && (
          <p className="mt-1.5 text-xs font-medium text-[#2E7D32]">
            Photo hébergée avec succès
          </p>
        )}
      </div>

      {/* ── GPS ── */}
      <div>
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
          Géolocalisation GPS{" "}
          <span className="font-normal normal-case text-[#94A3B8]">(facultatif)</span>
        </p>

        <button
          type="button"
          onClick={localiser}
          disabled={geoChargement}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-md transition-colors disabled:opacity-60"
          style={{ borderColor: "#E2E8F0", color: "#0D2B4E", backgroundColor: "white" }}
        >
          {geoChargement ? (
            <>
              <Spinner />
              Localisation en cours…
            </>
          ) : (
            <>
              <IcôneCible />
              {positionOk ? "Mettre à jour ma position" : "Localiser ma position"}
            </>
          )}
        </button>

        {positionOk && (
          <div className="mt-3 p-3 rounded-md text-xs font-medium"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#2E7D32" }}>
            Position capturée : {media.latitude}, {media.longitude}
          </div>
        )}

        {geoErreur && (
          <p className="mt-2 text-xs text-[#DC2626]">{geoErreur}</p>
        )}
      </div>

    </div>
  );
}

// ── Étape 4 — Confirmation ────────────────────────────────────────────────────

function Etape4({ valeurs, sites, media }) {
  const siteName    = sites.find((s) => s.id === valeurs.siteId)?.nom ?? "—";
  const typeConfig  = CONFIGS_TYPE.find((t) => t.value === valeurs.type);
  const graviteConf = CONFIGS_GRAVITE.find((g) => g.value === valeurs.gravite);

  const Ligne = ({ label, children }) => (
    <div className="flex gap-4 py-2.5 border-b border-[#F1F5F9] last:border-none">
      <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-[#1E293B] leading-relaxed">{children || "—"}</span>
    </div>
  );

  const dateFormatee = valeurs.dateIncident
    ? new Date(valeurs.dateIncident).toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "—";

  return (
    <div className="space-y-4 pt-1">
      <p className="text-sm text-[#64748B]">
        Vérifiez les informations avant de soumettre la déclaration.
      </p>
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-1">
        <Ligne label="Type">{typeConfig?.label ?? valeurs.type}</Ligne>
        <Ligne label="Gravité">
          {graviteConf ? (
            <span className="font-semibold" style={{ color: graviteConf.color }}>
              {graviteConf.label}
            </span>
          ) : (
            valeurs.gravite || "—"
          )}
        </Ligne>
        <Ligne label="Date">{dateFormatee}</Ligne>
        <Ligne label="Site">{siteName}</Ligne>
        <Ligne label="Lieu">{valeurs.adresseLisible || "—"}</Ligne>
        <Ligne label="Description">{valeurs.description}</Ligne>
        {media?.photoUrl && <Ligne label="Photo">{media.photoUrl}</Ligne>}
        {(media?.latitude || media?.longitude) && (
          <Ligne label="Coordonnées">
            {[media.latitude, media.longitude].filter(Boolean).join(", ")}
          </Ligne>
        )}
      </div>
    </div>
  );
}

// ── Wizard principal ──────────────────────────────────────────────────────────

function IncidentWizard({ sites, onSuccess, onClose }) {
  const [etape, setEtape] = useState(1);
  const [media, setMedia] = useState({ photoUrl: "", latitude: "", longitude: "" });
  const [erreurSoumission, setErreurSoumission] = useState("");
  const [confirmerVisible, setConfirmerVisible] = useState(false);

  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      type:           "",
      gravite:        "FAIBLE",
      description:    "",
      dateIncident:   "",
      siteId:         "",
      adresseLisible: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const valeurs = watch();

  const avancer = async () => {
    const champs = ETAPES_WIZARD[etape - 1].champs;
    const valide = champs.length === 0 || (await trigger(champs));
    if (valide) setEtape((n) => n + 1);
  };

  const reculer = () => setEtape((n) => n - 1);

  const onSubmit = async (data) => {
    setErreurSoumission("");
    try {
      const payload = {
        ...data,
        ...(media.photoUrl  && { photoUrl:  media.photoUrl }),
        ...(media.latitude  && { latitude:  parseFloat(media.latitude) }),
        ...(media.longitude && { longitude: parseFloat(media.longitude) }),
      };
      await api.post("/incidents", payload);
      setConfirmerVisible(false);
      toast.success("Incident déclaré avec succès");
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la déclaration.";
      setErreurSoumission(msg);
      toast.error(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-lg border border-[#E2E8F0] mx-4 flex flex-col relative"
        style={{ maxHeight: "90vh" }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#F1F5F9] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#1E293B]">Déclarer un incident</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Étape {etape} sur {ETAPES_WIZARD.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition text-base leading-none"
          >
            &#x2715;
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <StepperIndicateur etape={etape} />
        </div>

        {/* Contenu scrollable */}
        <div className="px-6 overflow-y-auto flex-1 pb-4">
          <form id="incident-wizard-form" onSubmit={handleSubmit(onSubmit)}>
            {etape === 1 && (
              <Etape1 valeurs={valeurs} setValue={setValue} errors={errors} />
            )}
            {etape === 2 && (
              <Etape2
                valeurs={valeurs}
                setValue={setValue}
                errors={errors}
                register={register}
                sites={sites}
              />
            )}
            {etape === 3 && <Etape3 media={media} onChange={setMedia} />}
            {etape === 4 && (
              <Etape4 valeurs={valeurs} sites={sites} media={media} />
            )}
          </form>
        </div>

        {/* Modale de confirmation de déclaration */}
        {confirmerVisible && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-lg">
            <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl mx-6 p-6 w-full max-w-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#2E7D32]/10 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1E293B]">Confirmer la déclaration</h3>
                  <p className="text-xs text-[#64748B] mt-1">
                    Une fois soumis, l'incident sera transmis au Responsable QHSE pour validation. Cette action est irréversible.
                  </p>
                </div>
              </div>
              {erreurSoumission && (
                <p className="text-xs text-[#DC2626] mb-3 bg-[#FEF2F2] border border-[#FECACA] rounded px-3 py-2">{erreurSoumission}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setConfirmerVisible(false); setErreurSoumission(""); }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#2E7D32] hover:bg-[#2E7D32]/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi en cours…
                    </span>
                  ) : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pied de page — navigation */}
        <div className="px-6 py-4 border-t border-[#F1F5F9] shrink-0">
          {!confirmerVisible && erreurSoumission && (
            <p className="text-xs text-[#DC2626] mb-3">{erreurSoumission}</p>
          )}
          <div className="flex items-center justify-between">
            <div>
              {etape > 1 && (
                <button
                  type="button"
                  onClick={reculer}
                  className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors"
                >
                  Précédent
                </button>
              )}
            </div>
            <div>
              {etape < ETAPES_WIZARD.length ? (
                <button
                  type="button"
                  onClick={avancer}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#0D2B4E] hover:bg-[#0D2B4E]/90 transition-colors"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setConfirmerVisible(true)}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#2E7D32] hover:bg-[#2E7D32]/90 disabled:opacity-50 transition-colors"
                >
                  Déclarer l'incident
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modale de rejet (motif obligatoire) ──────────────────────────────────────

function ModalRejeter({ incident, onConfirm, onClose }) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const confirmer = async () => {
    if (!motif.trim() || motif.trim().length < 5) {
      setErreur("Le motif doit faire au moins 5 caractères.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await onConfirm(motif.trim());
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-base font-semibold text-[#1E293B]">Rejeter l'incident</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#475569]">
            {incident.numeroReference} — {incident.description?.slice(0, 80)}…
          </div>
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Motif de rejet *
            </label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
              placeholder="Expliquez pourquoi cet incident est rejeté…"
              className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] transition resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={confirmer} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#DC2626" }}>
            {envoi ? "Rejet en cours…" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Boutons d'action workflow ─────────────────────────────────────────────────

function BoutonsAction({ incident, user, isQhse, enCours, onAction, onRejeter }) {
  const estDeclarant = user?.id === incident.declarePar?.id;

  if (incident.statut === "BROUILLON" && estDeclarant) {
    return (
      <button
        onClick={() => onAction(incident.id, "soumettre")}
        disabled={enCours}
        className="px-2.5 py-1 text-xs font-semibold rounded-md text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: "#0D2B4E" }}
      >
        {enCours ? "…" : "Soumettre"}
      </button>
    );
  }

  if (incident.statut === "OUVERT" && isQhse) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onAction(incident.id, "valider")}
          disabled={enCours}
          className="px-2.5 py-1 text-xs font-semibold rounded-md text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#2E7D32" }}
        >
          {enCours ? "…" : "Valider"}
        </button>
        <button
          onClick={() => onRejeter(incident)}
          disabled={enCours}
          className="px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors disabled:opacity-50 hover:bg-red-50"
          style={{ borderColor: "#DC2626", color: "#DC2626" }}
        >
          Rejeter
        </button>
      </div>
    );
  }

  if (incident.statut === "EN_COURS" && isQhse) {
    return (
      <button
        onClick={() => onAction(incident.id, "cloturer")}
        disabled={enCours}
        className="px-2.5 py-1 text-xs font-semibold rounded-md text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: "#475569" }}
      >
        {enCours ? "…" : "Clôturer"}
      </button>
    );
  }

  return null;
}

// ── Page principale ───────────────────────────────────────────────────────────

function IncidentsPage() {
  const user = useAuthStore((s) => s.user);
  const { isQhse } = useRole();

  const [incidents,      setIncidents]      = useState([]);
  const [sites,          setSites]          = useState([]);
  const [chargement,     setChargement]     = useState(true);
  const [showWizard,     setShowWizard]     = useState(false);
  const [erreurAction,   setErreurAction]   = useState("");
  const [actionEnCours,  setActionEnCours]  = useState(null);
  const [incidentRejet,  setIncidentRejet]  = useState(null);

  // Filtres
  const [filtreStatut,  setFiltreStatut]  = useState("");
  const [filtreType,    setFiltreType]    = useState("");
  const [filtreGravite, setFiltreGravite] = useState("");

  // Pagination
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    document.title = "CONFORYS — Incidents";
    return () => { document.title = "CONFORYS"; };
  }, []);

  // charger accepte des overrides pour éviter les décalages liés aux mises à jour asynchrones de l'état React
  const charger = async ({ statut = filtreStatut, type = filtreType, gravite = filtreGravite, pg = page } = {}) => {
    setChargement(true);
    try {
      const params = { page: pg, limit: 20 };
      if (statut)  params.statut  = statut;
      if (type)    params.type    = type;
      if (gravite) params.gravite = gravite;
      const res = await api.get("/incidents", { params });
      setIncidents(res.data.data       || []);
      setTotal(res.data.total          || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error("Erreur chargement incidents:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
  }, []);

  // ── Gestionnaires de filtres ───────────────────────────────────────────────

  const changerFiltre = (clé, val, setFn) => {
    setFn(val);
    setPage(1);
    charger({
      statut:  clé === "statut"  ? val : filtreStatut,
      type:    clé === "type"    ? val : filtreType,
      gravite: clé === "gravite" ? val : filtreGravite,
      pg: 1,
    });
  };

  const reinitialiserFiltres = () => {
    setFiltreStatut(""); setFiltreType(""); setFiltreGravite("");
    setPage(1);
    charger({ statut: "", type: "", gravite: "", pg: 1 });
  };

  const changerPage = (pg) => {
    setPage(pg);
    charger({ pg });
  };

  // ── Actions workflow ───────────────────────────────────────────────────────

  const LIBELLES_ACTION = {
    soumettre: "Incident soumis pour validation",
    valider:   "Incident validé",
    rejeter:   "Incident rejeté",
    cloturer:  "Incident clôturé",
  };

  const effectuerAction = async (incidentId, action, body = {}) => {
    setErreurAction("");
    setActionEnCours({ id: incidentId, action });
    try {
      await api.put(`/incidents/${incidentId}/${action}`, body);
      toast.success(LIBELLES_ACTION[action] ?? "Action effectuée");
      await charger();
    } catch (err) {
      const msg = err.response?.data?.message || `Erreur lors de l'action "${action}".`;
      setErreurAction(msg);
      toast.error(msg);
    } finally {
      setActionEnCours(null);
    }
  };

  const confirmerRejet = async (motifRejet) => {
    if (!incidentRejet) return;
    await effectuerAction(incidentRejet.id, "rejeter", { motifRejet });
    setIncidentRejet(null);
  };

  const selectCls =
    "px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B]" +
    " focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition";

  const filtresActifs = filtreStatut || filtreType || filtreGravite;

  return (
    <AppLayout titre="Incidents">
      {/* ── Barre supérieure ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#64748B]">
          {chargement ? "Chargement…" : `${total} incident(s)`}
        </p>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors"
          style={{ backgroundColor: "#0D2B4E" }}
        >
          Nouvel incident
        </button>
      </div>

      {/* ── Barre de filtres ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-white border border-[#E2E8F0] rounded-lg">
        <select
          value={filtreStatut}
          onChange={(e) => changerFiltre("statut", e.target.value, setFiltreStatut)}
          className={selectCls}
        >
          <option value="">Tous les statuts</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="OUVERT">Ouvert</option>
          <option value="EN_COURS">En cours</option>
          <option value="CLOS">Clos</option>
          <option value="REJETE">Rejeté</option>
        </select>

        <select
          value={filtreType}
          onChange={(e) => changerFiltre("type", e.target.value, setFiltreType)}
          className={selectCls}
        >
          <option value="">Tous les types</option>
          <option value="ACCIDENT">Accident</option>
          <option value="PRESQU_ACCIDENT">Presqu'accident</option>
          <option value="SITUATION_DANGEREUSE">Situation dangereuse</option>
          <option value="INCIDENT_ENVIRONNEMENTAL">Incident environnemental</option>
        </select>

        <select
          value={filtreGravite}
          onChange={(e) => changerFiltre("gravite", e.target.value, setFiltreGravite)}
          className={selectCls}
        >
          <option value="">Toutes les gravités</option>
          <option value="FAIBLE">Faible</option>
          <option value="MOYEN">Moyen</option>
          <option value="GRAVE">Grave</option>
          <option value="CRITIQUE">Critique</option>
        </select>

        {filtresActifs && (
          <button
            onClick={reinitialiserFiltres}
            className="text-xs text-[#64748B] hover:text-[#1E293B] underline transition-colors"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* ── Bandeau d'erreur workflow ── */}
      {erreurAction && (
        <div className="mb-4 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <span>{erreurAction}</span>
          <button
            onClick={() => setErreurAction("")}
            className="ml-4 text-[#94A3B8] hover:text-[#64748B] text-base leading-none"
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* ── Tableau ── */}
      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement…</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Référence", "Type", "Gravité", "Statut", "Date", "Lieu", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#94A3B8]">
                    {filtresActifs
                      ? "Aucun incident ne correspond aux filtres sélectionnés."
                      : "Aucun incident enregistré."}
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const boutonEnCours = actionEnCours?.id === inc.id
                    ? actionEnCours.action
                    : null;
                  return (
                    <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="font-semibold text-[#0D2B4E] hover:underline"
                        >
                          {inc.numeroReference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {LABELS_TYPE[inc.type] ?? inc.type}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={inc.gravite} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={inc.statut} />
                      </td>
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                        {inc.dateIncident
                          ? new Date(inc.dateIncident).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {inc.adresseLisible || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <BoutonsAction
                          incident={inc}
                          user={user}
                          isQhse={isQhse}
                          enCours={!!boutonEnCours}
                          onAction={effectuerAction}
                          onRejeter={setIncidentRejet}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <p className="text-xs text-[#64748B]">
                Page {page} / {totalPages} — {total} résultat(s)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changerPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => changerPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modale de rejet */}
      {incidentRejet && (
        <ModalRejeter
          incident={incidentRejet}
          onConfirm={confirmerRejet}
          onClose={() => setIncidentRejet(null)}
        />
      )}

      {/* Wizard de déclaration */}
      {showWizard && (
        <IncidentWizard
          sites={sites}
          onSuccess={() => { setShowWizard(false); charger(); }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </AppLayout>
  );
}

export default IncidentsPage;
