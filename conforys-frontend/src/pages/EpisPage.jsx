import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  HardHat, Hand, Footprints, Shirt, ShieldCheck, Filter, Plus, Search, BarChart3,
  History,
} from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import ActionButton from "../components/ui/ActionButton";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";
import { epiSchema } from "../validators/epiSchema";

// ── Charte de couleurs — alignée sur la charte standard de l'application ────
// (navy #0D2B4E, rouge #DC2626 : mêmes valeurs que la page Incidents, prise
// comme référence). Les teintes "secondary*" du mockup d'origine ne sont plus
// utilisées : chaque couleur d'alerte est désormais choisie pour son sens
// (vert = bon état, orange = avertissement, rouge = alerte réelle).
const C = {
  primary:           "#0D2B4E",
  primaryContainer:  "#1a2b4b",
  outlineVariant:    "#c5c6cf",
  onSurfaceVariant:  "#64748B",
  surface:           "#f8f9ff",
  surfaceContainerLow: "#eff4ff",
  error:             "#DC2626",
  errorContainer:    "#FEF2F2",
  success:           "#2E7D32",
};

const FORM_DEFAUT = {
  designation: "", type: "", reference: "", photoUrl: "", quantite: "", seuilAlerte: "",
  siteId: "", datePeremption: "", frequenceInspectionJours: "",
};

const FORM_INSPECTION_DEFAUT = { dateInspection: new Date().toISOString().split("T")[0], conforme: true, commentaire: "" };

const TYPES_ACCEPTES   = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_OCTET = 5 * 1024 * 1024; // 5 Mo

const formatDateInput = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");
const formatDateAffichage = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);
const estPerime = (d) => Boolean(d && new Date(d) < new Date());

// Prochaine échéance d'inspection — simple indication à l'affichage, le
// niveauAlerte calculé côté serveur reste la source de vérité pour l'urgence.
const calculerProchaineInspection = (epi) => {
  if (!epi.frequenceInspectionJours) return null;
  if (!epi.derniereInspection) return "À planifier";
  const prochaine = new Date(epi.derniereInspection);
  prochaine.setDate(prochaine.getDate() + epi.frequenceInspectionJours);
  return formatDateAffichage(prochaine);
};

// ── Icône par défaut selon le type d'EPI (repli quand il n'y a pas de photo) ──

function iconeParType(type, size = 28) {
  const t = (type || "").toLowerCase();
  const props = { size, color: C.primary, strokeWidth: 1.6 };
  if (t.includes("casque") || t.includes("tête")) return <HardHat {...props} />;
  if (t.includes("gant")) return <Hand {...props} />;
  if (t.includes("chaussure") || t.includes("botte") || t.includes("pied")) return <Footprints {...props} />;
  if (t.includes("gilet") || t.includes("veste")) return <Shirt {...props} />;
  return <ShieldCheck {...props} />;
}

function Spinner({ size = 4 }) {
  return <div className={`w-${size} h-${size} border-2 border-white/60 border-t-transparent rounded-full animate-spin shrink-0`} />;
}

// ── Bandeau visuel EPI — photo si disponible, sinon fond coloré + icône ──────

function BandeauEpi({ photoUrl, type }) {
  // Si l'image hébergée (ImgBB) échoue à charger — réseau, hébergement
  // temporairement indisponible, etc. — on retombe sur l'icône par défaut
  // au lieu de laisser un cadre vide/cassé.
  const [erreurChargement, setErreurChargement] = useState(false);

  if (photoUrl && !erreurChargement) {
    // object-contain : la photo entière reste visible (quitte à laisser un
    // léger bandeau vide sur les côtés) au lieu d'être rognée par object-cover.
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: C.surfaceContainerLow }}>
        <img src={photoUrl} alt={type || "EPI"} className="w-full h-full object-contain"
          onError={() => setErreurChargement(true)} />
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: C.surfaceContainerLow }}>
      {iconeParType(type, 36)}
    </div>
  );
}

// ── Anneau de progression (SVG statique, façon mockup) ───────────────────────

function AnneauProgression({ taux, couleur }) {
  const circonference = 2 * Math.PI * 15.9155;
  return (
    <div className="w-28 h-28 relative shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="transparent" stroke="#E2E8F0" strokeWidth="3" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="transparent" stroke={couleur} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${(taux / 100) * circonference}, ${circonference}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold" style={{ color: couleur }}>{taux}%</span>
      </div>
    </div>
  );
}

// ── Cartes de synthèse (bento) ────────────────────────────────────────────────

function CarteEtatStock({ epis }) {
  const total = epis.length;
  const nbOk = epis.filter((e) => e.niveauAlerte === "OK").length;
  // Même critère que la colonne "Statut" du tableau détaillé (niveauAlerte
  // calculé serveur, qui intègre péremption et retard d'inspection, pas
  // seulement le stock) — évite un compteur incohérent avec le tableau.
  const nbAlerte = epis.filter((e) => e.niveauAlerte === "ALERTE").length;
  const niveauOptimal = total === 0 ? 100 : Math.round((nbOk / total) * 100);

  return (
    <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <h2 className="text-lg font-semibold text-navy">État du stock</h2>
        <BarChart3 size={18} color={C.primary} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span style={{ color: C.onSurfaceVariant }}>Niveau optimal</span>
          <span className="font-bold" style={{ color: "#2E7D32" }}>{niveauOptimal}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
          <div className="h-full rounded-full" style={{ width: `${niveauOptimal}%`, backgroundColor: "#2E7D32" }} />
        </div>
        <div className="flex justify-between items-center text-sm pt-1">
          <span style={{ color: C.onSurfaceVariant }}>En alerte</span>
          <span className="font-bold" style={{ color: nbAlerte > 0 ? "#DC2626" : C.onSurfaceVariant }}>
            {nbAlerte} article{nbAlerte !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function CarteRepartitionGlobale({ epis, affectations }) {
  const total = epis.length;
  const nbOk = epis.filter((e) => e.niveauAlerte === "OK").length;
  const nbAlerte = epis.filter((e) => e.niveauAlerte !== "OK").length;
  const taux = total === 0 ? 100 : Math.round((nbOk / total) * 100);
  const uniteAffectees = affectations.filter((a) => a.statut === "ACTIVE").length;

  return (
    <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-lg p-5 flex items-center justify-between gap-6">
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-navy">Répartition globale</h2>
        <p className="text-sm mt-0.5" style={{ color: C.onSurfaceVariant }}>Équipements actuellement en circulation dans l'entreprise.</p>
        <div className="mt-4 flex gap-8">
          <div>
            <p className="text-xl font-bold" style={{ color: C.primary }}>{uniteAffectees}</p>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Unités affectées</p>
          </div>
          <div className="border-l pl-8" style={{ borderColor: C.outlineVariant }}>
            <p className="text-xl font-bold" style={{ color: nbAlerte > 0 ? "#DC2626" : C.onSurfaceVariant }}>{nbAlerte}</p>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>En alerte</p>
          </div>
        </div>
      </div>
      <AnneauProgression taux={taux} couleur="#2E7D32" />
    </div>
  );
}

// ── Avatar à initiales — employé affecté à un EPI ────────────────────────────

function AvatarInitiales({ prenom, nom }) {
  const init = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div
      title={`${prenom ?? ""} ${nom ?? ""}`.trim()}
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 border-2 border-white -ml-2 first:ml-0"
      style={{ backgroundColor: C.primary }}
    >
      {init}
    </div>
  );
}

// ── Carte individuelle d'un EPI ────────────────────────────────────────────────

function CarteEpi({ epi, affectationsActives }) {
  const perime = estPerime(epi.datePeremption);
  // Stock bas au sens strict — utilisé uniquement pour la couleur du chiffre
  // "Stock" ci-dessous. Le badge et le contour, eux, reflètent l'état global
  // de l'EPI (niveauAlerte serveur, qui intègre aussi péremption et retard
  // d'inspection) pour rester cohérents avec le tableau détaillé en dessous.
  const stockBas = epi.quantite <= epi.seuilAlerte;
  const derniereInspection = formatDateAffichage(epi.derniereInspection);
  const prochaineInspection = calculerProchaineInspection(epi);
  const MAX_AVATARS = 4;

  // Badge partagé (même composant/forme/couleurs que la page Incidents) :
  // rouge=Périmé/Alerte, orange="À surveiller" (variante BIENTOT), vert="En stock" (variante OK)
  const badgeStatut = perime
    ? { variant: "PERIME" }
    : epi.niveauAlerte === "ALERTE"
    ? { variant: "ALERTE" }
    : epi.niveauAlerte === "BIENTOT"
    ? { variant: "BIENTOT", label: "À surveiller" }
    : { variant: "OK", label: "En stock" };
  const contourCouleur = epi.niveauAlerte === "ALERTE" ? "#DC2626" : epi.niveauAlerte === "BIENTOT" ? "#EA580C" : null;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col"
      style={contourCouleur ? { outline: `2px solid ${contourCouleur}` } : undefined}>
      <div className="h-32 relative">
        <BandeauEpi photoUrl={epi.photoUrl} type={epi.type} />
        <div className="absolute top-2.5 right-2.5">
          <Badge variant={badgeStatut.variant} label={badgeStatut.label} />
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h4 className="font-semibold text-[15px] text-[#1E293B]">{epi.designation}</h4>
            <p className="text-xs" style={{ color: C.onSurfaceVariant }}>{epi.type}{epi.reference ? ` · ${epi.reference}` : ""}</p>
          </div>
        </div>
        <div className="flex justify-between items-end border-t pt-3 mt-3" style={{ borderColor: C.outlineVariant }}>
          <div>
            <p className="text-xs" style={{ color: C.onSurfaceVariant }}>Stock</p>
            <p className="text-sm font-semibold" style={{ color: stockBas ? "#EA580C" : C.primary }}>{epi.quantite} / {epi.seuilAlerte}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: C.onSurfaceVariant }}>Dernière inspection</p>
            <p className="text-sm font-semibold" style={{ color: "#1E293B" }}>{derniereInspection ?? "Non inspecté"}</p>
          </div>
        </div>
        {prochaineInspection && (
          <p className="text-xs mt-1.5 font-semibold" style={{ color: epi.niveauAlerte !== "OK" ? C.error : C.onSurfaceVariant }}>
            Prochaine inspection : {prochaineInspection}
          </p>
        )}

        {affectationsActives.length > 0 && (
          <div className="flex items-center mt-3">
            <div className="flex">
              {affectationsActives.slice(0, MAX_AVATARS).map((a) => (
                <AvatarInitiales key={a.id} prenom={a.employe.prenom} nom={a.employe.nom} />
              ))}
            </div>
            {affectationsActives.length > MAX_AVATARS && (
              <span className="ml-1.5 text-[10px] font-semibold" style={{ color: C.onSurfaceVariant }}>
                +{affectationsActives.length - MAX_AVATARS}
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const inputClsFull =
  "w-full px-3 py-2.5 text-sm border rounded-lg bg-white text-[#1E293B] placeholder-[#94A3B8] " +
  "focus:outline-none focus:ring-2 transition";

// ── Page principale ───────────────────────────────────────────────────────────

function EpisPage() {
  const navigate = useNavigate();
  const { can } = useRole();
  const peutGerer = can("RESPONSABLE_QHSE");

  const [epis,       setEpis]       = useState([]);
  const [sites,      setSites]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurListe, setErreurListe] = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [erreurForm, setErreurForm] = useState("");
  const [epiEnEdition, setEpiEnEdition] = useState(null);

  // ── Upload de la photo de l'EPI (ImgBB) ───────────────────────────────────
  const [photoUrl,      setPhotoUrl]      = useState("");
  const [apercuPhoto,   setApercuPhoto]   = useState("");
  const [uploadPhoto,   setUploadPhoto]   = useState(false);
  const [erreurPhoto,   setErreurPhoto]   = useState("");

  const [showFiltres,  setShowFiltres]  = useState(false);
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreSite,   setFiltreSite]   = useState("");

  // ── Affectation des EPI aux employés ──────────────────────────────────────
  const [users,        setUsers]        = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [showModalAffecter, setShowModalAffecter] = useState(false);
  const [epiAAffecter,      setEpiAAffecter]      = useState(null);
  const [formAffectation,   setFormAffectation]   = useState({ employeId: "", poste: "" });
  const [erreurAffectation, setErreurAffectation] = useState("");
  const [envoiAffectation,  setEnvoiAffectation]  = useState(false);

  // ── Enregistrement des inspections ────────────────────────────────────────
  const [showModalInspection,  setShowModalInspection]  = useState(false);
  const [epiAInspecter,        setEpiAInspecter]        = useState(null);
  const [formInspection,       setFormInspection]       = useState(FORM_INSPECTION_DEFAUT);
  const [envoiInspection,      setEnvoiInspection]      = useState(false);

  // ── Vue "Mes EPI affectés" ─────────────────────────────────────────────────
  const [vueMesEpis,       setVueMesEpis]       = useState(false);
  const [mesEpis,          setMesEpis]          = useState(null);
  const [chargementMesEpis, setChargementMesEpis] = useState(false);
  const [erreurMesEpis,    setErreurMesEpis]    = useState("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    mode: "onBlur",
    resolver: zodResolver(epiSchema),
    defaultValues: FORM_DEFAUT,
  });

  const episFiltres = epis
    .filter((e) => !filtreStatut || e.niveauAlerte === filtreStatut)
    .filter((e) => !filtreSite   || e.siteId === filtreSite);

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(episFiltres, ["designation", "type"]);

  useEffect(() => {
    document.title = "EPI";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    setErreurListe("");
    try {
      const res = await api.get("/epis");
      setEpis(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement EPI:", e);
      setErreurListe("Impossible de charger l'inventaire EPI. Vérifiez votre connexion et réessayez.");
    } finally {
      setChargement(false);
    }
  };

  const chargerAffectations = async () => {
    try {
      const res = await api.get("/affectations");
      setAffectations(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement affectations:", e);
    }
  };

  // Charge les EPI affectés au connecté (tous rôles), au premier affichage
  // de l'onglet "Mes EPI affectés" seulement (lazy).
  const chargerMesEpis = async () => {
    setChargementMesEpis(true);
    setErreurMesEpis("");
    try {
      const res = await api.get("/affectations/mes-epis");
      setMesEpis(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement mes EPI:", e);
      setErreurMesEpis("Impossible de charger vos EPI affectés. Vérifiez votre connexion et réessayez.");
    } finally {
      setChargementMesEpis(false);
    }
  };

  const basculerVueMesEpis = (activer) => {
    setVueMesEpis(activer);
    if (activer && mesEpis === null) chargerMesEpis();
  };

  useEffect(() => {
    charger();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
    if (peutGerer) {
      api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
      chargerAffectations();
    }
  }, []);

  const ouvrirModalAffecter = (epi) => {
    setErreurAffectation("");
    setEpiAAffecter(epi);
    setFormAffectation({ employeId: "", poste: "" });
    setShowModalAffecter(true);
  };

  const soumettreAffectation = async () => {
    if (!formAffectation.employeId) {
      setErreurAffectation("Sélectionnez un employé.");
      return;
    }
    setErreurAffectation("");
    setEnvoiAffectation(true);
    try {
      await api.post(`/epis/${epiAAffecter.id}/affecter`, formAffectation);
      toast.success("EPI affecté avec succès");
      setShowModalAffecter(false);
      charger();
      chargerAffectations();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'affectation.";
      setErreurAffectation(msg);
      toast.error(msg);
    } finally {
      setEnvoiAffectation(false);
    }
  };

  const affectationsActivesParEpi = (epiId) =>
    affectations.filter((a) => a.epiId === epiId && a.statut === "ACTIVE");

  const ouvrirModalInspection = (epi) => {
    setEpiAInspecter(epi);
    setFormInspection(FORM_INSPECTION_DEFAUT);
    setShowModalInspection(true);
  };

  const soumettreInspection = async () => {
    setEnvoiInspection(true);
    try {
      await api.post(`/epis/${epiAInspecter.id}/inspections`, formInspection);
      toast.success("Inspection enregistrée avec succès");
      setShowModalInspection(false);
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de l'inspection.");
    } finally {
      setEnvoiInspection(false);
    }
  };

  const ouvrirCreation = () => {
    setErreurForm("");
    setEpiEnEdition(null);
    setPhotoUrl("");
    setApercuPhoto("");
    setErreurPhoto("");
    reset(FORM_DEFAUT);
    setShowModal(true);
  };

  const ouvrirModification = (epi) => {
    setErreurForm("");
    setEpiEnEdition(epi);
    setPhotoUrl(epi.photoUrl || "");
    setApercuPhoto(epi.photoUrl || "");
    setErreurPhoto("");
    reset({
      designation: epi.designation,
      type: epi.type,
      reference: epi.reference || "",
      quantite: epi.quantite,
      seuilAlerte: epi.seuilAlerte,
      siteId: epi.siteId,
      datePeremption: formatDateInput(epi.datePeremption),
      frequenceInspectionJours: epi.frequenceInspectionJours ?? "",
    });
    setShowModal(true);
  };

  // ── Upload de la photo vers ImgBB ─────────────────────────────────────────
  const handleFichierPhoto = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setErreurPhoto("Formats acceptés : JPG, PNG, WebP.");
      return;
    }
    if (fichier.size > TAILLE_MAX_OCTET) {
      setErreurPhoto("Fichier trop volumineux (max 5 Mo).");
      return;
    }

    if (apercuPhoto) URL.revokeObjectURL(apercuPhoto);
    setApercuPhoto(URL.createObjectURL(fichier));
    setErreurPhoto("");
    setPhotoUrl("");
    setUploadPhoto(true);
    try {
      const fd = new FormData();
      fd.append("image", fichier);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Réponse ImgBB invalide.");
      setPhotoUrl(json.data.url);
    } catch (err) {
      setErreurPhoto(
        err.message?.includes("fetch")
          ? "Impossible de joindre ImgBB. Vérifiez votre connexion."
          : (err.message || "Échec de l'envoi.")
      );
      setApercuPhoto("");
    } finally {
      setUploadPhoto(false);
    }
  };

  const onSubmit = async (data) => {
    // Filet de sécurité : si la photo est encore en cours d'envoi vers ImgBB,
    // `photoUrl` n'a pas encore sa valeur définitive — enregistrer maintenant
    // sauvegarderait l'EPI sans photo, silencieusement.
    if (uploadPhoto) {
      setErreurForm("Patientez la fin de l'envoi de la photo avant d'enregistrer.");
      return;
    }
    setErreurForm("");
    const payload = {
      ...data,
      reference: data.reference || null,
      photoUrl: photoUrl || null,
      datePeremption: data.datePeremption || null,
      frequenceInspectionJours: data.frequenceInspectionJours || null,
    };
    try {
      if (epiEnEdition) {
        await api.put(`/epis/${epiEnEdition.id}`, payload);
        toast.success("EPI modifié avec succès");
      } else {
        await api.post("/epis", payload);
        toast.success("EPI enregistré avec succès");
      }
      setShowModal(false);
      charger();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'enregistrement.";
      setErreurForm(msg);
      toast.error(msg);
    }
  };

  const inputCls = (name) =>
    `${inputClsFull} ${errors[name] ? "border-[#DC2626]" : ""}`;

  const filtresActifs = filtreStatut || filtreSite;

  return (
    <AppLayout titre="Gestion des EPI">
      <div>

        {/* ── En-tête ── */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs text-[#94A3B8] mb-1">Tableau de bord <span className="mx-1">›</span> Gestion des EPI</p>
            <h1 className="text-2xl font-bold text-navy">Inventaire des équipements de protection</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFiltres((v) => !v)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border flex items-center gap-2 transition-colors"
              style={showFiltres
                ? { backgroundColor: C.surfaceContainerLow, borderColor: C.primary, color: C.primary }
                : { borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
              <Filter size={15} /> Filtrer
            </button>
            {peutGerer && (
              <button onClick={() => navigate("/epis/historique")}
                className="px-4 py-2 text-sm font-semibold rounded-lg border flex items-center gap-2 transition-colors"
                style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
                <History size={15} /> Historique
              </button>
            )}
            {peutGerer && (
              <button onClick={ouvrirCreation}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg flex items-center gap-2 shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: C.primary }}>
                <Plus size={15} /> Nouvel EPI
              </button>
            )}
          </div>
        </div>

        {/* ── Bascule Tous les EPI / Mes EPI affectés ── */}
        <div className="flex items-center gap-1 mb-6 p-1 bg-[#F1F5F9] rounded-lg w-fit">
          <button onClick={() => basculerVueMesEpis(false)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
            style={!vueMesEpis ? { backgroundColor: "white", color: C.primary, boxShadow: "0 1px 2px rgba(15,23,42,0.08)" } : { color: C.onSurfaceVariant }}>
            Tous les EPI
          </button>
          <button onClick={() => basculerVueMesEpis(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
            style={vueMesEpis ? { backgroundColor: "white", color: C.primary, boxShadow: "0 1px 2px rgba(15,23,42,0.08)" } : { color: C.onSurfaceVariant }}>
            Mes EPI affectés
          </button>
        </div>

        {vueMesEpis ? (
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden mb-6">
            {chargementMesEpis ? (
              <div className="flex items-center gap-2 text-sm p-8" style={{ color: C.onSurfaceVariant }}><Spinner /> Chargement…</div>
            ) : erreurMesEpis ? (
              <div className="p-4 text-sm flex items-center justify-between" style={{ color: C.error }}>
                <span>{erreurMesEpis}</span>
                <button onClick={chargerMesEpis} className="ml-4 text-xs font-semibold underline shrink-0">Réessayer</button>
              </div>
            ) : !mesEpis || mesEpis.length === 0 ? (
              <div className="p-12 text-center" style={{ color: C.onSurfaceVariant }}>
                Aucun EPI ne vous est actuellement affecté.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      {["Désignation", "Type", "Poste", "Affecté le", "Statut"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {mesEpis.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-3 font-semibold text-[#1E293B]">{a.epi?.designation}</td>
                        <td className="px-4 py-3 text-[#475569]">{a.epi?.type || "Non renseigné"}</td>
                        <td className="px-4 py-3 text-[#64748B]">{a.poste || "—"}</td>
                        <td className="px-4 py-3 text-[#64748B]">{formatDateAffichage(a.dateAffectation) ?? "—"}</td>
                        <td className="px-4 py-3"><Badge variant={a.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
        <>
        {/* ── Cartes de synthèse (bento) ── */}
        {!chargement && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
            <CarteEtatStock epis={epis} />
            <CarteRepartitionGlobale epis={epis} affectations={affectations} />
          </div>
        )}

        {/* ── Panneau de filtres (repliable) ── */}
        {showFiltres && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white border border-[#E2E8F0] rounded-lg">
            <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}
              className="py-2 pl-3 pr-7 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 transition"
              style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
              <option value="">Tous les statuts</option>
              <option value="OK">OK</option>
              <option value="BIENTOT">Bientôt</option>
              <option value="ALERTE">Alerte</option>
            </select>
            <select value={filtreSite} onChange={(e) => setFiltreSite(e.target.value)}
              className="py-2 pl-3 pr-7 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 transition"
              style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
              <option value="">Tous les sites</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            {filtresActifs && (
              <button onClick={() => { setFiltreStatut(""); setFiltreSite(""); }}
                className="text-xs font-semibold hover:underline" style={{ color: C.onSurfaceVariant }}>
                Réinitialiser
              </button>
            )}
          </div>
        )}

        {/* ── Recherche ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.onSurfaceVariant }} />
            <input type="text" placeholder="Rechercher par désignation, type…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
              className={`pl-9 ${inputClsFull}`} style={{ borderColor: C.outlineVariant }} />
          </div>
          <span className="text-sm shrink-0" style={{ color: C.onSurfaceVariant }}>{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
        </div>

        {chargement ? (
          <div className="flex items-center gap-2 text-sm py-8" style={{ color: C.onSurfaceVariant }}><Spinner /> Chargement…</div>
        ) : erreurListe ? (
          <div className="p-4 text-sm rounded-lg border border-red-200 bg-red-50 flex items-center justify-between" style={{ color: C.error }}>
            <span>{erreurListe}</span>
            <button onClick={charger} className="ml-4 text-xs font-semibold underline shrink-0">
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {/* ── Grille de cartes ── */}
            {affiches.length === 0 ? (
              <div className="p-12 text-center rounded-lg border border-[#E2E8F0] bg-white mb-6" style={{ color: C.onSurfaceVariant }}>
                {recherche || filtresActifs ? "Aucun EPI ne correspond aux critères." : "Aucun EPI enregistré"}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
                {affiches.slice(0, 4).map((epi) => (
                  <CarteEpi
                    key={epi.id}
                    epi={epi}
                    affectationsActives={affectationsActivesParEpi(epi.id)}
                  />
                ))}
              </div>
            )}

            {/* ── Tableau détaillé ── */}
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white mb-6">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h3 className="text-[15px] font-semibold text-[#1E293B]">Inventaire détaillé</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      {["Désignation", "Type", "Site", "Stock", "Seuil", "Statut", "Péremption", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {affiches.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-[#94A3B8]">Aucun EPI à afficher.</td></tr>
                    ) : (
                      affiches.map((epi) => {
                        const enAlerteStock = epi.quantite <= epi.seuilAlerte;
                        const perime = estPerime(epi.datePeremption);
                        const peremption = formatDateAffichage(epi.datePeremption);
                        return (
                          <tr key={epi.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#1E293B]">{epi.designation}</td>
                            <td className="px-4 py-3 text-[#475569]">{epi.type || "Non renseigné"}</td>
                            <td className="px-4 py-3 text-[#64748B]">{epi.site?.nom ?? "Non renseigné"}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: enAlerteStock ? "#EA580C" : "#1E293B" }}>{epi.quantite}</td>
                            <td className="px-4 py-3 text-[#64748B]">{epi.seuilAlerte}</td>
                            <td className="px-4 py-3"><Badge variant={epi.niveauAlerte} /></td>
                            <td className="px-4 py-3">
                              {perime ? <Badge variant="PERIME" /> : <span className="text-[#64748B]">{peremption ?? "Non renseignée"}</span>}
                            </td>
                            <td className="px-4 py-3">
                              {peutGerer && (
                                <div className="flex items-center gap-2">
                                  <ActionButton variant="outline" onClick={() => ouvrirModification(epi)}>
                                    Modifier
                                  </ActionButton>
                                  <ActionButton variant="outline" onClick={() => ouvrirModalInspection(epi)}>
                                    Inspecter
                                  </ActionButton>
                                  <ActionButton variant="primary" disabled={epi.quantite <= 0} onClick={() => ouvrirModalAffecter(epi)}>
                                    Affecter
                                  </ActionButton>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← Précédent
                  </button>
                  <span className="text-xs text-[#64748B]">Page {page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Suivant →
                  </button>
                </div>
              )}
            </div>

          </>
        )}
        </>
        )}

        {/* ── Modale de création / modification ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: C.outlineVariant }}>
                <h2 className="text-lg font-semibold text-navy">{epiEnEdition ? "Modifier l'EPI" : "Nouvel EPI"}</h2>
                <button onClick={() => setShowModal(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f9ff]">
                  &#x2715;
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                {erreurForm && (
                  <div className="p-3 text-sm rounded-lg" style={{ color: C.error, backgroundColor: C.errorContainer }}>{erreurForm}</div>
                )}
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Désignation</label>
                  <input type="text" {...register("designation")} placeholder="ex: Casque de chantier" className={inputCls("designation")} style={{ borderColor: errors.designation ? C.error : C.outlineVariant }} />
                  {errors.designation && <p className="mt-1 text-xs" style={{ color: C.error }}>{errors.designation.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Type</label>
                    <input type="text" {...register("type")} placeholder="ex: Protection tête" className={inputCls("type")} style={{ borderColor: errors.type ? C.error : C.outlineVariant }} />
                    {errors.type && <p className="mt-1 text-xs" style={{ color: C.error }}>{errors.type.message}</p>}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Référence</label>
                    <input type="text" {...register("reference")} placeholder="ex: REF-4521" className={inputCls("reference")} style={{ borderColor: C.outlineVariant }} />
                  </div>
                </div>

                {/* ── Photo de l'EPI (facultatif) ── */}
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>
                    Photo <span className="font-normal normal-case" style={{ color: C.onSurfaceVariant }}>(facultatif)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: C.surface }}>
                      {apercuPhoto ? (
                        <img src={apercuPhoto} alt="Aperçu" className="w-full h-full object-contain" />
                      ) : (
                        <ShieldCheck size={22} color={C.primary} strokeWidth={1.6} />
                      )}
                    </div>
                    <label className="flex-1 flex items-center justify-center px-3 py-2.5 text-sm border-2 border-dashed rounded-lg cursor-pointer transition-colors select-none"
                      style={{ borderColor: photoUrl ? C.primary : C.outlineVariant, backgroundColor: photoUrl ? C.surface : "transparent" }}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFichierPhoto} disabled={uploadPhoto} className="sr-only" />
                      {uploadPhoto ? (
                        <span className="flex items-center gap-2" style={{ color: C.onSurfaceVariant }}>
                          <Spinner size={4} /> Envoi de la photo…
                        </span>
                      ) : photoUrl ? (
                        <span className="font-semibold" style={{ color: C.primary }}>Photo envoyée, cliquer pour changer</span>
                      ) : (
                        <span style={{ color: C.onSurfaceVariant }}>Sélectionner une photo</span>
                      )}
                    </label>
                  </div>
                  {erreurPhoto && <p className="mt-1.5 text-xs" style={{ color: C.error }}>{erreurPhoto}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Quantité</label>
                    <input type="number" {...register("quantite")} min={0} className={inputCls("quantite")} style={{ borderColor: errors.quantite ? C.error : C.outlineVariant }} />
                    {errors.quantite && <p className="mt-1 text-xs" style={{ color: C.error }}>{errors.quantite.message}</p>}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Seuil d'alerte</label>
                    <input type="number" {...register("seuilAlerte")} min={0} className={inputCls("seuilAlerte")} style={{ borderColor: errors.seuilAlerte ? C.error : C.outlineVariant }} />
                    {errors.seuilAlerte && <p className="mt-1 text-xs" style={{ color: C.error }}>{errors.seuilAlerte.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Site</label>
                  <select {...register("siteId")} className={inputCls("siteId")} style={{ borderColor: errors.siteId ? C.error : C.outlineVariant }}>
                    <option value="">Sélectionner un site</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                  {errors.siteId && <p className="mt-1 text-xs" style={{ color: C.error }}>{errors.siteId.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>
                      Fréquence d'inspection <span className="font-normal normal-case" style={{ color: C.onSurfaceVariant }}>(jours)</span>
                    </label>
                    <input type="number" {...register("frequenceInspectionJours")} min={1} placeholder="ex: 180" className={inputCls("frequenceInspectionJours")} style={{ borderColor: errors.frequenceInspectionJours ? C.error : C.outlineVariant }} />
                    {errors.frequenceInspectionJours && <p className="mt-1 text-xs" style={{ color: C.error }}>{errors.frequenceInspectionJours.message}</p>}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Péremption</label>
                    <input type="date" {...register("datePeremption")} className={inputCls("datePeremption")} style={{ borderColor: C.outlineVariant }} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: C.outlineVariant }}>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border" style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
                    Annuler
                  </button>
                  <button type="submit" disabled={isSubmitting || uploadPhoto}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: C.primary }}>
                    {uploadPhoto ? "Envoi de la photo…" : isSubmitting ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modale d'affectation ── */}
        {showModalAffecter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => e.target === e.currentTarget && setShowModalAffecter(false)}>
            <div className="w-full max-w-sm bg-white rounded-lg border border-[#E2E8F0] mx-4">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: C.outlineVariant }}>
                <h2 className="text-lg font-semibold text-navy">Affecter un EPI</h2>
                <button onClick={() => setShowModalAffecter(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f9ff]">
                  &#x2715;
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm" style={{ color: C.onSurfaceVariant }}>{epiAAffecter?.designation}</p>
                {erreurAffectation && (
                  <div className="p-3 text-sm rounded-lg" style={{ color: C.error, backgroundColor: C.errorContainer }}>{erreurAffectation}</div>
                )}
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Employé</label>
                  <select value={formAffectation.employeId} onChange={(e) => setFormAffectation((f) => ({ ...f, employeId: e.target.value }))}
                    className={inputClsFull} style={{ borderColor: C.outlineVariant }}>
                    <option value="">Sélectionner un employé</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>
                    Poste <span className="font-normal normal-case" style={{ color: C.onSurfaceVariant }}>(optionnel)</span>
                  </label>
                  <input type="text" value={formAffectation.poste} onChange={(e) => setFormAffectation((f) => ({ ...f, poste: e.target.value }))}
                    placeholder="ex: Chantier A" className={inputClsFull} style={{ borderColor: C.outlineVariant }} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: C.outlineVariant }}>
                <button type="button" onClick={() => setShowModalAffecter(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border" style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
                  Annuler
                </button>
                <button type="button" onClick={soumettreAffectation} disabled={envoiAffectation}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: C.primary }}>
                  {envoiAffectation ? "Affectation…" : "Affecter"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modale d'inspection ── */}
        {showModalInspection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => e.target === e.currentTarget && setShowModalInspection(false)}>
            <div className="w-full max-w-sm bg-white rounded-lg border border-[#E2E8F0] mx-4">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: C.outlineVariant }}>
                <h2 className="text-lg font-semibold text-navy">Enregistrer une inspection</h2>
                <button onClick={() => setShowModalInspection(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f9ff]">
                  &#x2715;
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm" style={{ color: C.onSurfaceVariant }}>{epiAInspecter?.designation}</p>
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Date d'inspection</label>
                  <input type="date" value={formInspection.dateInspection}
                    onChange={(e) => setFormInspection((f) => ({ ...f, dateInspection: e.target.value }))}
                    className={inputClsFull} style={{ borderColor: C.outlineVariant }} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="conforme" checked={formInspection.conforme}
                    onChange={(e) => setFormInspection((f) => ({ ...f, conforme: e.target.checked }))}
                    className="w-4 h-4 rounded" style={{ accentColor: C.primary }} />
                  <label htmlFor="conforme" className="text-sm" style={{ color: "#1E293B" }}>L'EPI est conforme</label>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>
                    Commentaire <span className="font-normal normal-case" style={{ color: C.onSurfaceVariant }}>(optionnel)</span>
                  </label>
                  <textarea value={formInspection.commentaire}
                    onChange={(e) => setFormInspection((f) => ({ ...f, commentaire: e.target.value }))}
                    rows={3} placeholder="Observations éventuelles…" className={inputClsFull} style={{ borderColor: C.outlineVariant }} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: C.outlineVariant }}>
                <button type="button" onClick={() => setShowModalInspection(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border" style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
                  Annuler
                </button>
                <button type="button" onClick={soumettreInspection} disabled={envoiInspection}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: C.primary }}>
                  {envoiInspection ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default EpisPage;
