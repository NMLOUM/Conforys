import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Plus, AlertTriangle, ShieldAlert, CheckCircle2, Clock, Download,
  Siren, Leaf, Camera, ImagePlus, Crosshair, ArrowLeft, ArrowRight, Check,
} from "lucide-react";
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
  { value: "ACCIDENT",                 label: "Accident",                 desc: "Blessure physique survenue sur une personne",   icon: Siren,        color: "#DC2626" },
  { value: "PRESQU_ACCIDENT",          label: "Presqu'accident",          desc: "Événement sans blessure mais à fort potentiel", icon: ShieldAlert,  color: "#EA580C" },
  { value: "SITUATION_DANGEREUSE",     label: "Situation dangereuse",     desc: "Condition pouvant provoquer un accident",       icon: AlertTriangle, color: "#CA8A04" },
  { value: "INCIDENT_ENVIRONNEMENTAL", label: "Incident environnemental", desc: "Impact direct sur l'environnement naturel",     icon: Leaf,          color: "#2E7D32" },
];

const CONFIGS_GRAVITE = [
  { value: "FAIBLE",   label: "Faible",   color: "#2E7D32", bg: "#F0FDF4" },
  { value: "MOYEN",    label: "Moyen",    color: "#CA8A04", bg: "#FEFCE8" },
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
                style={
                  done || active
                    ? { backgroundColor: "#0D2B4E", color: "white" }
                    : { backgroundColor: "white", color: "#0D2B4E", border: "2px solid #0D2B4E" }
                }
              >
                {done ? <Check size={14} strokeWidth={3} /> : info.num}
              </div>
              <span
                className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-center"
                style={{ color: "#0D2B4E" }}
              >
                {info.label}
              </span>
            </div>
            {i < ETAPES_WIZARD.length - 1 && (
              <div
                className="flex-1 h-px mt-4 transition-colors"
                style={{ backgroundColor: done ? "#0D2B4E" : "#E2E8F0" }}
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
        {CONFIGS_TYPE.map(({ value, label, desc, icon: Icon, color }) => {
          const selected = valeurs.type === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setValue("type", value, { shouldValidate: true })}
              className="relative text-left p-4 rounded-xl border-2 transition-all"
              style={{
                borderColor: selected ? color : "#E2E8F0",
                backgroundColor: selected ? `${color}0D` : "white",
                boxShadow: selected ? `0 1px 3px ${color}33` : "0 1px 2px rgba(15,23,42,0.03)",
              }}
            >
              {selected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: color }}>
                  <Check size={11} color="white" strokeWidth={3} />
                </div>
              )}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${color}1A` }}
              >
                <Icon size={19} color={color} strokeWidth={2} />
              </div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: selected ? color : "#1E293B" }}
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
            <option value="">Choisir un site</option>
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
        <div className="relative">
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Décrivez l'incident avec précision (min. 10 caractères)…"
            className={`${inputCls("description")} resize-none pb-6`}
          />
          <span className="absolute bottom-2 right-3 text-[11px] text-[#94A3B8] pointer-events-none">
            {(valeurs.description || "").length} caractères
          </span>
        </div>
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

      <p className="text-sm text-[#64748B]">
        Vous pouvez ajouter une photo et la localisation si elles sont disponibles.
        Cette étape est facultative, vous pouvez continuer sans.
      </p>

      {/* ── Photo ── */}
      <div>
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
          Photo de l'incident{" "}
          <span className="font-normal normal-case text-[#94A3B8]">(facultatif)</span>
        </p>

        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B] px-4 py-3 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA]">
            <Spinner />
            Envoi de la photo…
          </div>
        ) : apercu && media.photoUrl ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border" style={{ borderColor: "#0D2B4E", backgroundColor: "rgba(13,43,78,0.03)" }}>
            <span className="text-sm font-medium text-[#0D2B4E] flex-1">Photo envoyée</span>
            <label className="text-xs font-semibold text-[#0D2B4E] hover:underline cursor-pointer">
              Changer
              <input type="file" accept="image/*" onChange={handleFichier} className="sr-only" />
            </label>
          </div>
        ) : (
          <div className="flex gap-2">
            <label
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg cursor-pointer select-none transition-colors hover:opacity-90"
              style={{ backgroundColor: "#0D2B4E" }}
            >
              <Camera size={16} strokeWidth={2} />
              Capturer
              <input type="file" accept="image/*" capture="environment" onChange={handleFichier} className="sr-only" />
            </label>
            <label
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer select-none transition-colors hover:bg-[#F8FAFC]"
              style={{ borderColor: "#0D2B4E", color: "#0D2B4E" }}
            >
              <ImagePlus size={16} strokeWidth={2} />
              Importer
              <input type="file" accept="image/*" onChange={handleFichier} className="sr-only" />
            </label>
          </div>
        )}

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
              <Crosshair size={15} strokeWidth={2} />
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
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-1 shadow-sm">
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
        {media?.photoUrl && (
          <Ligne label="Photo">
            <img src={media.photoUrl} alt="Aperçu" className="h-14 rounded-md object-cover border border-[#E2E8F0]" />
          </Ligne>
        )}
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
  const navigate = useNavigate();
  const [etape, setEtape] = useState(1);
  const [media, setMedia] = useState({ photoUrl: "", latitude: "", longitude: "" });
  const [erreurSoumission, setErreurSoumission] = useState("");
  const [incidentCree, setIncidentCree] = useState(null);

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
      const res = await api.post("/incidents", payload);
      toast.success("Incident déclaré avec succès");
      // Affiche l'écran de succès plutôt que de fermer directement — le
      // déclarant doit encore choisir où aller (fiche ou liste).
      setIncidentCree(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la déclaration.";
      setErreurSoumission(msg);
      toast.error(msg);
    }
  };

  const voirIncident = () => {
    onClose();
    navigate(`/incidents/${incidentCree.id}`);
  };

  const retourListe = () => onSuccess();

  // ── Écran de succès post-soumission ──
  if (incidentCree) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] shadow-lg mx-4 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(46, 125, 50, 0.1)" }}>
              <CheckCircle2 size={26} color="#2E7D32" strokeWidth={2} />
            </div>
            <h2 className="text-base font-semibold text-[#1E293B] mb-1">Incident déclaré avec succès</h2>
            <p className="text-sm text-[#64748B] leading-relaxed max-w-xs">
              Enregistré en brouillon. Vous pourrez le soumettre pour traitement depuis sa fiche.
            </p>
            <div className="mt-5 px-6 py-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-0.5">
                Référence du dossier
              </span>
              <span className="text-xl font-bold text-[#0D2B4E] tracking-tight">
                {incidentCree.numeroReference}
              </span>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={retourListe}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors hover:bg-[#F8FAFC]"
              style={{ borderColor: "#0D2B4E", color: "#0D2B4E" }}
            >
              Retour à la liste
            </button>
            <button
              type="button"
              onClick={voirIncident}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: "#0D2B4E" }}
            >
              Voir l'incident
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl border border-[#E2E8F0] shadow-lg mx-4 flex flex-col relative"
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

        {/* Pied de page : navigation */}
        <div className="px-6 py-4 border-t border-[#F1F5F9] shrink-0">
          {erreurSoumission && (
            <p className="text-xs text-[#DC2626] mb-3">{erreurSoumission}</p>
          )}
          <div className="flex items-center justify-between">
            <div>
              {etape > 1 && (
                <button
                  type="button"
                  onClick={reculer}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors hover:bg-[#F8FAFC]"
                  style={{ borderColor: "#0D2B4E", color: "#0D2B4E" }}
                >
                  <ArrowLeft size={15} strokeWidth={2.2} />
                  Précédent
                </button>
              )}
            </div>
            <div>
              {etape < ETAPES_WIZARD.length ? (
                <button
                  type="button"
                  onClick={avancer}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#0D2B4E" }}
                >
                  Continuer
                  <ArrowRight size={15} strokeWidth={2.2} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#0D2B4E" }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi en cours…
                    </span>
                  ) : "Confirmer la déclaration"}
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
            {incident.numeroReference} : {incident.description?.slice(0, 80)}…
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

// ── Carte KPI (en-tête de la page) ───────────────────────────────────────────
function CarteKpi({ icon: Icon, label, value, couleur = "#0D2B4E", alerte = false }) {
  return (
    <div
      className="flex-1 min-w-[190px] p-4 bg-white border border-[#E2E8F0] rounded-lg flex items-center gap-3"
      style={alerte ? { borderLeft: `3px solid ${couleur}` } : undefined}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${couleur}1A` }}>
        <Icon size={16} color={couleur} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold leading-tight" style={{ color: couleur }}>{value}</p>
      </div>
    </div>
  );
}

// ── Avatar initiales (déclarant) ──────────────────────────────────────────────
function AvatarInitiales({ prenom, nom }) {
  if (!prenom && !nom) return <span className="text-[#94A3B8]">—</span>;
  const initiales = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
        style={{ backgroundColor: "#0D2B4E" }}>
        {initiales || "?"}
      </div>
      <span className="text-sm text-[#1E293B] truncate">{prenom} {nom}</span>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function IncidentsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
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

  // KPI d'en-tête — calculés à partir de données réelles (dashboard + actions
  // + incidents clôturés), indépendamment de la pagination du tableau
  const [kpi, setKpi] = useState({ ouverts: 0, critiques: 0, actionsCloturees: 0, delaiMoyen: null });
  const [exportEnCours, setExportEnCours] = useState(false);

  useEffect(() => {
    document.title = "Incidents";
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

  // Statistiques réelles des cartes KPI — appels en lecture seule, séparés du
  // tableau paginé pour ne pas fausser les chiffres avec les seuls incidents
  // affichés à l'écran.
  const chargerKpi = async () => {
    try {
      const [resDashboard, resActions, resClotures] = await Promise.all([
        api.get("/dashboard/incidents"),
        api.get("/actions"),
        api.get("/incidents", { params: { statut: "CLOS", limit: 500 } }),
      ]);

      const parStatut  = resDashboard.data.data?.parStatut  || [];
      const parGravite = resDashboard.data.data?.parGravite || [];
      const ouverts = parStatut
        .filter((s) => s.statut === "OUVERT" || s.statut === "EN_COURS")
        .reduce((somme, s) => somme + (s._count?.statut ?? 0), 0);
      const critiques = parGravite.find((g) => g.gravite === "CRITIQUE")?._count?.gravite ?? 0;

      const actionsCloturees = (resActions.data.data || [])
        .filter((a) => a.incidentId && a.statut === "TERMINE").length;

      const clotures = resClotures.data.data || [];
      const delais = clotures
        .filter((i) => i.dateCloture && i.dateDeclaration)
        .map((i) => (new Date(i.dateCloture) - new Date(i.dateDeclaration)) / (1000 * 60 * 60 * 24));
      const delaiMoyen = delais.length > 0 ? delais.reduce((a, b) => a + b, 0) / delais.length : null;

      setKpi({ ouverts, critiques, actionsCloturees, delaiMoyen });
    } catch (e) {
      console.error("Erreur chargement KPI incidents:", e);
    }
  };

  useEffect(() => {
    charger();
    chargerKpi();
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

  // Export CSV — reprend les filtres actifs, récupère l'ensemble des
  // incidents correspondants (pas seulement la page affichée) et génère le
  // fichier entièrement côté client, sans nouvel endpoint.
  const exporterCsv = async () => {
    setExportEnCours(true);
    try {
      const params = { page: 1, limit: 1000 };
      if (filtreStatut)  params.statut  = filtreStatut;
      if (filtreType)    params.type    = filtreType;
      if (filtreGravite) params.gravite = filtreGravite;
      const res = await api.get("/incidents", { params });
      const lignes = res.data.data || [];

      const entetes = ["Référence", "Date", "Type", "Gravité", "Statut", "Déclarant", "Lieu"];
      const echapper = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const corps = lignes.map((inc) => [
        inc.numeroReference,
        inc.dateIncident ? new Date(inc.dateIncident).toLocaleDateString("fr-FR") : "",
        LABELS_TYPE[inc.type] ?? inc.type,
        inc.gravite,
        inc.statut,
        inc.declarePar ? `${inc.declarePar.prenom} ${inc.declarePar.nom}` : "",
        inc.adresseLisible || "",
      ].map(echapper).join(","));
      const csv = "﻿" + [entetes.map(echapper).join(","), ...corps].join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Erreur lors de l'export des incidents.");
    } finally {
      setExportEnCours(false);
    }
  };

  const selectCls =
    "px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B]" +
    " focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition";

  const filtresActifs = filtreStatut || filtreType || filtreGravite;

  return (
    <AppLayout titre="Incidents">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-navy">Gestion des incidents</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Suivi des événements et risques QHSE</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors"
          style={{ backgroundColor: "#0D2B4E" }}
        >
          <Plus size={16} strokeWidth={2.2} />
          Déclarer un incident
        </button>
      </div>

      {/* ── Cartes KPI ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <CarteKpi icon={AlertTriangle} label="Incidents ouverts" value={kpi.ouverts} />
        <CarteKpi icon={ShieldAlert} label="Gravité critique" value={kpi.critiques} couleur="#DC2626" alerte />
        <CarteKpi icon={CheckCircle2} label="Actions clôturées" value={kpi.actionsCloturees} couleur="#2E7D32" />
        <CarteKpi icon={Clock} label="Délai de traitement moyen"
          value={kpi.delaiMoyen != null ? `${kpi.delaiMoyen.toFixed(1)} j` : "—"} couleur="#475569" />
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

        <div className="ml-auto flex items-center gap-3">
          <p className="text-xs text-[#94A3B8]">{chargement ? "Chargement…" : `${total} incident(s)`}</p>
          <button
            onClick={exporterCsv}
            disabled={exportEnCours}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border disabled:opacity-50 transition-colors hover:bg-[#F8FAFC]"
            style={{ borderColor: "#E2E8F0", color: "#0D2B4E" }}
          >
            <Download size={14} strokeWidth={2.2} />
            {exportEnCours ? "Export…" : "Exporter"}
          </button>
        </div>
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
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Référence", "Date", "Type", "Gravité", "Statut", "Déclarant", "Actions"].map((h) => (
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
                    <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="group hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className="font-semibold text-[#0D2B4E] group-hover:underline">
                          {inc.numeroReference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                        {inc.dateIncident
                          ? new Date(inc.dateIncident).toLocaleDateString("fr-FR")
                          : "—"}
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
                      <td className="px-4 py-3">
                        <AvatarInitiales prenom={inc.declarePar?.prenom} nom={inc.declarePar?.nom} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} sur {total} incidents
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changerPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Précédent
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipse-${i}`} className="px-1.5 text-xs text-[#94A3B8]">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => changerPage(p)}
                        className="w-7 h-7 flex items-center justify-center text-xs font-medium rounded-md transition-colors"
                        style={p === page
                          ? { backgroundColor: "#0D2B4E", color: "white" }
                          : { color: "#475569" }}
                      >
                        {p}
                      </button>
                    )
                  )}
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
