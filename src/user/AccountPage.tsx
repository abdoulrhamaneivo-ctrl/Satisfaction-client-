import { useState } from "react";
import type { User } from "wasp/entities";
import { updateProfile, changePassword, changeEmail } from "wasp/client/operations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { PasswordInput } from "../client/components/ui/password-input";
import { Separator } from "../client/components/ui/separator";
import { useToast } from "../client/hooks/use-toast";
import { PageHeader } from "../client/components/PageHeader";
import { AmbientBackground } from "../client/components/AmbientBackground";
import { UserRound, ShieldCheck } from "lucide-react";

// Page de compte personnel — inspirée des grands SaaS (Notion, Slack...) :
// deux sections claires, "Profil" (nom, prénom, téléphone, e-mail) et
// "Sécurité" (mot de passe), chacune avec son propre bouton d'enregistrement
// et son propre état de chargement, pour qu'une erreur sur l'un n'affecte
// jamais l'autre.
export function AccountPage({ user }: { user: User }) {
  const mustChangePassword = (user as any).mustChangePassword === true;
  return (
    <AmbientBackground>
      <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
        <PageHeader
          icon={UserRound}
          eyebrow="Mon compte"
          title="Paramètres du compte"
          description="Gérez vos informations personnelles et la sécurité de votre compte."
        />
        {mustChangePassword && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <strong>Action requise :</strong> pour des raisons de sécurité, vous devez définir un nouveau
            mot de passe avant de pouvoir accéder au reste de l'application.
          </div>
        )}
        <ProfilSection user={user} />
        <SecuriteSection user={user} />
      </div>
    </AmbientBackground>
  );
}

function ProfilSection({ user }: { user: User }) {
  const { toast } = useToast();
  const [nom, setNom] = useState(user.nom || "");
  const [prenom, setPrenom] = useState(user.prenom || "");
  const [telephone, setTelephone] = useState(user.telephone || "");
  const [email, setEmail] = useState(user.email || "");
  const [passwordPourEmail, setPasswordPourEmail] = useState("");
  const [savingProfil, setSavingProfil] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const profilModifie = nom !== (user.nom || "") || prenom !== (user.prenom || "") || telephone !== (user.telephone || "");
  const emailModifie = email.trim().toLowerCase() !== (user.email || "").toLowerCase();

  const handleSaveProfil = async () => {
    if (!nom.trim() || !prenom.trim()) {
      toast({ variant: "destructive", title: "Champs requis", description: "Le nom et le prénom sont obligatoires." });
      return;
    }
    setSavingProfil(true);
    try {
      await updateProfile({ nom, prenom, telephone });
      toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Erreur inconnue" });
    } finally {
      setSavingProfil(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!passwordPourEmail) {
      toast({ variant: "destructive", title: "Mot de passe requis", description: "Confirmez votre mot de passe pour changer d'e-mail." });
      return;
    }
    setSavingEmail(true);
    try {
      await changeEmail({ newEmail: email, currentPassword: passwordPourEmail });
      setPasswordPourEmail("");
      toast({ title: "E-mail mis à jour", description: "Utilisez votre nouvelle adresse pour vous connecter la prochaine fois." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Erreur inconnue" });
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserRound className="size-4 text-primary" />
          Informations personnelles
        </CardTitle>
        <CardDescription>Votre nom et vos coordonnées, visibles par votre équipe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prenom">Prénom</Label>
            <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={100} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} maxLength={30} placeholder="Ex : 0102030405" />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveProfil} disabled={!profilModifie || savingProfil}>
            {savingProfil ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            C'est l'adresse que vous utilisez pour vous connecter.
          </p>
        </div>

        {emailModifie && (
          <div className="space-y-1.5 rounded-lg border border-border/70 bg-card-subtle/40 p-3">
            <Label htmlFor="password-email">Confirmez avec votre mot de passe</Label>
            <PasswordInput
              id="password-email"
              value={passwordPourEmail}
              onChange={(e) => setPasswordPourEmail(e.target.value)}
              placeholder="Mot de passe actuel"
            />
          </div>
        )}

        {emailModifie && (
          <div className="flex justify-end">
            <Button onClick={handleSaveEmail} disabled={savingEmail}>
              {savingEmail ? "Enregistrement..." : "Changer l'e-mail"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SecuriteSection({ user }: { user: User }) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Mot de passe trop court", description: "Au moins 8 caractères." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Les mots de passe ne correspondent pas", description: "Vérifiez la confirmation." });
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Mot de passe changé", description: "Votre mot de passe a été mis à jour avec succès." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="size-4 text-primary" />
          Sécurité
        </CardTitle>
        <CardDescription>Changez votre mot de passe régulièrement pour protéger votre compte.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Mot de passe actuel</Label>
          <PasswordInput id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <PasswordInput id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <PasswordInput id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Au moins 8 caractères.</p>
        <div className="flex justify-end">
          <Button onClick={handleChangePassword} disabled={saving || !currentPassword || !newPassword}>
            {saving ? "Changement..." : "Changer le mot de passe"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}