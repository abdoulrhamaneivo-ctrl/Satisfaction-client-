import { getRouteObjects } from "wasp/client/app/router";
import { initializeQueryClient } from "wasp/client/operations";
import { lazy } from "react"

import { createAuthRequiredPage } from "wasp/client/app"

import { App as App_ext } from './src/client/App'



const routesMapping = {
  LandingPageRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/RacinePage').then(m => m.RacinePage)
        .then(component => ({ default: component }))
      ),
  },
  NotFoundRoute: {
    Component:
      lazy(() =>
        import('./src/client/components/NotFoundPage').then(m => m.NotFoundPage)
        .then(component => ({ default: component }))
      ),
  },
  LoginRoute: {
    Component:
      lazy(() =>
        import('./src/auth/LoginPage').then(m => m.LoginPage)
        .then(component => ({ default: component }))
      ),
  },
  PostAuthRedirectRoute: {
    Component:
      lazy(() =>
        import('./src/auth/PostAuthRedirectPage').then(m => m.PostAuthRedirectPage)
        .then(component => ({ default: component }))
      ),
  },
  RequestPasswordResetRoute: {
    Component:
      lazy(() =>
        import('./src/auth/email-and-pass/RequestPasswordResetPage').then(m => m.RequestPasswordResetPage)
        .then(component => ({ default: component }))
      ),
  },
  PasswordResetRoute: {
    Component:
      lazy(() =>
        import('./src/auth/email-and-pass/PasswordResetPage').then(m => m.PasswordResetPage)
        .then(component => ({ default: component }))
      ),
  },
  EmailVerificationRoute: {
    Component:
      lazy(() =>
        import('./src/auth/email-and-pass/EmailVerificationPage').then(m => m.EmailVerificationPage)
        .then(component => ({ default: component }))
      ),
  },
  AccountRoute: {
    Component:
      lazy(() =>
        import('./src/user/AccountPage').then(m => m.AccountPage)
        .then(component => createAuthRequiredPage(component))
        .then(component => ({ default: component }))
      ),
  },
  FileUploadRoute: {
    Component:
      lazy(() =>
        import('./src/file-upload/FileUploadPage').then(m => m.FileUploadPage)
        .then(component => createAuthRequiredPage(component))
        .then(component => ({ default: component }))
      ),
  },
  GuichetsRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/GuichetsPage').then(m => m.GuichetsPage)
        .then(component => ({ default: component }))
      ),
  },
  PlanningRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/PlanningPage').then(m => m.PlanningPage)
        .then(component => ({ default: component }))
      ),
  },
  DashboardRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/DashboardPage').then(m => m.DashboardPage)
        .then(component => ({ default: component }))
      ),
  },
  AdminPersonnelRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/AdminPersonnelPage').then(m => m.AdminPersonnelPage)
        .then(component => ({ default: component }))
      ),
  },
  GestionAgencesRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/GestionAgencesPage').then(m => m.GestionAgencesPage)
        .then(component => ({ default: component }))
      ),
  },
  AvisRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/AvisPage').then(m => m.AvisPage)
        .then(component => ({ default: component }))
      ),
  },
  ConfigurationCriteresRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/ConfigurationCriteresPage').then(m => m.ConfigurationCriteresPage)
        .then(component => ({ default: component }))
      ),
  },
  CollecteRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/CollectePage').then(m => m.CollectePage)
        .then(component => ({ default: component }))
      ),
  },
  CollecteCodeRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/CollectePage').then(m => m.CollectePage)
        .then(component => ({ default: component }))
      ),
  },
  AlertesTachesRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/AlertesTachesPage').then(m => m.AlertesTachesPage)
        .then(component => ({ default: component }))
      ),
  },
  ArchivesRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/ArchivesPage').then(m => m.ArchivesPage)
        .then(component => ({ default: component }))
      ),
  },
  SettingsRoute: {
    Component:
      lazy(() =>
        import('./src/client/pages/SettingsPage').then(m => m.SettingsPage)
        .then(component => ({ default: component }))
      ),
  },
  PlatformOverviewRoute: {
    Component:
      lazy(() =>
        import('./src/client/platform/pages/PlatformOverviewPage').then(m => m.default)
        .then(component => ({ default: component }))
      ),
  },
  PlatformCompaniesRoute: {
    Component:
      lazy(() =>
        import('./src/client/platform/pages/CompaniesPage').then(m => m.default)
        .then(component => ({ default: component }))
      ),
  },
  PlatformNewCompanyRoute: {
    Component:
      lazy(() =>
        import('./src/client/platform/pages/CreateCompanyPage').then(m => m.default)
        .then(component => ({ default: component }))
      ),
  },
  PlatformCompanyDetailRoute: {
    Component:
      lazy(() =>
        import('./src/client/platform/pages/CompanyDetailsPage').then(m => m.default)
        .then(component => ({ default: component }))
      ),
  },
  PlatformAuditRoute: {
    Component:
      lazy(() =>
        import('./src/client/platform/pages/AuditLogsPage').then(m => m.default)
        .then(component => ({ default: component }))
      ),
  },
  PlatformSecurityRoute: {
    Component:
      lazy(() =>
        import('./src/client/platform/pages/SecurityPage').then(m => m.default)
        .then(component => ({ default: component }))
      ),
  },
  ActivateAccountRoute: {
    Component:
      lazy(() =>
        import('./src/client/platform/pages/ActivateAccountPage').then(m => m.default)
        .then(component => ({ default: component }))
      ),
  },
} as const;


initializeQueryClient()

const rootElement =
  <App_ext />

export const routeObjects = getRouteObjects({
  routesMapping,
  rootElement,
})
