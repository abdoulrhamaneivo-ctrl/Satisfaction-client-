import * as z from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { hashPassword, createJWTHelpers } from '@wasp.sh/lib-auth/node';
import SendGrid from '@sendgrid/mail';

function colorize(color, text) {
  if (!supportsAnsiFormatting()) {
    return text;
  }
  const ansiColorCode = ansiColorCodes[color];
  return text.split("\n").map((line) => `${ansiColorCode}${line}${ansiResetCode}`).join("\n");
}
function supportsAnsiFormatting() {
  const isBrowser = !!globalThis.window;
  const isNode = !!globalThis.process;
  if (isBrowser && "chrome" in window) {
    return true;
  }
  if (isNode) {
    if ("NO_COLOR" in process.env) {
      return false;
    }
    return true;
  }
  return false;
}
const ansiColorCodes = {
  red: "\x1B[31m",
  yellow: "\x1B[33m"
};
const ansiResetCode = "\x1B[0m";

function ensureEnvSchema(data, schema) {
  const result = getValidatedEnvOrError(data, schema);
  if (result.success) {
    return result.data;
  } else {
    console.error(colorize("red", formatZodEnvError(result.error)));
    throw new Error("Error parsing environment variables");
  }
}
function getValidatedEnvOrError(env, schema) {
  return schema.safeParse(env);
}
function formatZodEnvError(error) {
  const flattenedIssues = z.flattenError(error);
  return [
    "\u2550\u2550 Env vars validation failed \u2550\u2550",
    "",
    // Top-level errors
    ...flattenedIssues.formErrors,
    "",
    // Errors per field
    ...Object.entries(flattenedIssues.fieldErrors).map(([prop, error2]) => `${prop} - ${error2}`),
    "",
    "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550"
  ].join("\n");
}

function defineEnvValidationSchema(schema) {
  return schema;
}

const authEnvSchema = z.object({
  ADMIN_EMAILS: z.string().default("").transform((val) => val.split(",").map((email) => email.trim()).filter(Boolean))
});

const fileUploadEnvSchema = z.object({
  AWS_S3_REGION: z.string().optional(),
  AWS_S3_IAM_ACCESS_KEY: z.string().optional(),
  AWS_S3_IAM_SECRET_KEY: z.string().optional(),
  AWS_S3_FILES_BUCKET: z.string().optional()
});

const serverEnvValidationSchema = defineEnvValidationSchema(z.object({
  ...authEnvSchema.shape,
  ...fileUploadEnvSchema.shape
}));

const userServerEnvSchema = serverEnvValidationSchema;
const waspCommonServerEnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string({
    error: "DATABASE_URL is required"
  }),
  PG_BOSS_NEW_OPTIONS: z.string().optional(),
  SENDGRID_API_KEY: z.string({
    error: getRequiredEnvVarErrorMessage("SendGrid email sender", "SENDGRID_API_KEY")
  }),
  SKIP_EMAIL_VERIFICATION_IN_DEV: z.enum(["true", "false"], {
    error: 'SKIP_EMAIL_VERIFICATION_IN_DEV must be either "true" or "false"'
  }).default("false").transform((value) => value === "true")
});
const serverUrlSchema = z.string({
  error: "WASP_SERVER_URL is required"
}).pipe(z.url({
  error: "WASP_SERVER_URL must be a valid URL"
}));
const clientUrlSchema = z.string({
  error: "WASP_WEB_CLIENT_URL is required"
}).pipe(z.url({
  error: "WASP_WEB_CLIENT_URL must be a valid URL"
}));
const jwtTokenSchema = z.string({
  error: "JWT_SECRET is required"
});
const waspDevServerEnvSchema = z.object({
  NODE_ENV: z.literal("development"),
  "WASP_SERVER_URL": serverUrlSchema.default("http://localhost:3001"),
  "WASP_WEB_CLIENT_URL": clientUrlSchema.default("http://localhost:3000/"),
  "JWT_SECRET": jwtTokenSchema.default("DEVJWTSECRET")
});
const waspProdServerEnvSchema = z.object({
  NODE_ENV: z.literal("production"),
  "WASP_SERVER_URL": serverUrlSchema,
  "WASP_WEB_CLIENT_URL": clientUrlSchema,
  "JWT_SECRET": jwtTokenSchema
});
const waspServerEnvSchema = z.discriminatedUnion("NODE_ENV", [
  z.object({ ...waspCommonServerEnvSchema.shape, ...waspDevServerEnvSchema.shape }),
  z.object({ ...waspCommonServerEnvSchema.shape, ...waspProdServerEnvSchema.shape })
]);
const serverEnvSchema = userServerEnvSchema.and(waspServerEnvSchema);
const defaultNodeEnvValue = waspDevServerEnvSchema.shape.NODE_ENV.value;
const { NODE_ENV: inputNodeEnvValue, ...restEnv } = process.env;
const env = ensureEnvSchema({
  NODE_ENV: inputNodeEnvValue ?? defaultNodeEnvValue,
  ...restEnv
}, serverEnvSchema);
function getRequiredEnvVarErrorMessage(featureName, envVarName) {
  return `${envVarName} is required when using ${featureName}`;
}

function stripTrailingSlash(url) {
  return url?.replace(/\/$/, "");
}
function getOrigin(url) {
  return new URL(url).origin;
}

const frontendUrl = stripTrailingSlash(env["WASP_WEB_CLIENT_URL"]);
stripTrailingSlash(env["WASP_SERVER_URL"]);
const allowedCORSOriginsPerEnv = {
  development: [/.*/],
  production: [getOrigin(frontendUrl)]
};
allowedCORSOriginsPerEnv[env.NODE_ENV];
const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  auth: {
    jwtSecret: env["JWT_SECRET"]
  }
};

function createDbClient() {
  return new PrismaClient();
}
const dbClient = createDbClient();

({
  entities: {
    User: dbClient.user
  }
});
function createProviderId(providerName, providerUserId) {
  return {
    providerName,
    providerUserId: normalizeProviderUserId(providerName, providerUserId)
  };
}
function normalizeProviderUserId(providerName, providerUserId) {
  switch (providerName) {
    case "email":
    case "username":
      return providerUserId.toLowerCase();
    case "google":
    case "github":
    case "discord":
    case "keycloak":
    case "slack":
    case "microsoft":
      return providerUserId;
    /*
          Why the default case?
          In case users add a new auth provider in the user-land.
          Users can't extend this function because it is private.
          If there is an unknown `providerName` in runtime, we'll
          return the `providerUserId` as is.
    
          We want to still have explicit OAuth providers listed
          so that we get a type error if we forget to add a new provider
          to the switch statement.
        */
    default:
      return providerUserId;
  }
}
async function createUser(providerId, serializedProviderData, userFields) {
  return dbClient.user.create({
    data: {
      // Using any here to prevent type errors when userFields are not
      // defined. We want Prisma to throw an error in that case.
      ...userFields ?? {},
      auth: {
        create: {
          identities: {
            create: {
              providerName: providerId.providerName,
              providerUserId: providerId.providerUserId,
              providerData: serializedProviderData
            }
          }
        }
      }
    },
    // We need to include the Auth entity here because we need `authId`
    // to be able to create a session.
    include: {
      auth: true
    }
  });
}
async function sanitizeAndSerializeProviderData(providerData) {
  return serializeProviderData(await ensurePasswordIsHashed(providerData));
}
function serializeProviderData(providerData) {
  return JSON.stringify(providerData);
}
async function ensurePasswordIsHashed(providerData) {
  const data = {
    ...providerData
  };
  if (providerDataHasPasswordField(data)) {
    data.hashedPassword = await hashPassword(data.hashedPassword);
  }
  return data;
}
function providerDataHasPasswordField(providerData) {
  return "hashedPassword" in providerData;
}

const JWT_SECRET = new TextEncoder().encode(config.auth.jwtSecret);
const JWT_ALGORITHM = "HS256";
const { createJWT, validateJWT } = createJWTHelpers(JWT_SECRET, JWT_ALGORITHM);

function getDefaultFromField() {
  return {
    email: "abdoulrhamane.ivo@gmail.com",
    name: "Yeba"
  };
}

function initSendGridEmailSender(provider) {
  SendGrid.setApiKey(provider.apiKey);
  const defaultFromField = getDefaultFromField();
  return {
    async send(email) {
      const fromField = email.from || defaultFromField;
      return SendGrid.send({
        from: {
          email: fromField.email,
          name: fromField.name
        },
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html
      }).catch((error) => {
        const responseErrors = error?.response?.body?.errors;
        if (responseErrors && Array.isArray(responseErrors)) {
          throw new AggregateError([...responseErrors, error], `SendGrid error: ${error.message}`);
        } else {
          throw error;
        }
      });
    }
  };
}

const emailProvider = {
  apiKey: env.SENDGRID_API_KEY
};
initSendGridEmailSender(emailProvider);

const NOM_ENTREPRISE = "Mon Entreprise";
const NOM_AGENCE = "Agence Centrale";
const COMMUNE_AGENCE = "Plateau";
const EMAIL_CHEF = "abdoulivo5@gmail.com";
async function seedEntrepriseUnique(prismaClient) {
  console.log("D\xE9but du seeding mono-agence...");
  const entrepriseCount = await prismaClient.entreprise.count();
  let entreprise;
  if (entrepriseCount === 0) {
    console.log(`Cr\xE9ation de l'entreprise : ${NOM_ENTREPRISE}...`);
    entreprise = await prismaClient.entreprise.create({
      data: { nom_entreprise: NOM_ENTREPRISE }
    });
  } else {
    entreprise = await prismaClient.entreprise.findFirstOrThrow({
      orderBy: { id: "asc" }
    });
    console.log(`Entreprise existante r\xE9utilis\xE9e : "${entreprise.nom_entreprise}" (ID: ${entreprise.id}).`);
    if (entrepriseCount > 1) {
      console.warn(
        `ATTENTION : ${entrepriseCount} entreprises d\xE9tect\xE9es en base de donn\xE9es (d\xE9ploiement mono-agence attendu : une seule). V\xE9rifiez qu'aucune cr\xE9ation manuelle erron\xE9e n'a eu lieu.`
      );
    }
  }
  let agence = await prismaClient.agence.findFirst({
    where: { nom_agence: NOM_AGENCE, id_entreprise: entreprise.id }
  });
  if (!agence) {
    console.log(`Cr\xE9ation de l'agence : ${NOM_AGENCE}...`);
    agence = await prismaClient.agence.create({
      data: {
        nom_agence: NOM_AGENCE,
        commune: COMMUNE_AGENCE,
        jours_ouvres: "1,2,3,4,5,6",
        id_entreprise: entreprise.id
      }
    });
  } else {
    console.log(`L'agence "${NOM_AGENCE}" existe d\xE9j\xE0 (ID: ${agence.id}).`);
  }
  console.log("Cr\xE9ation des crit\xE8res d'\xE9valuation...");
  await prismaClient.critere.createMany({
    data: [
      { id: 1, libelle_critere: "Temps d'attente", description: "Temps mis avant d'\xEAtre servi au guichet", id_entreprise: entreprise.id },
      { id: 2, libelle_critere: "Accueil guichetier", description: "Politesse et amabilit\xE9 de l'agent", id_entreprise: entreprise.id },
      { id: 3, libelle_critere: "Clart\xE9 des informations", description: "Clart\xE9 des explications fournies", id_entreprise: entreprise.id }
    ],
    skipDuplicates: true
  });
  console.log("Cr\xE9ation des types de services...");
  await prismaClient.service.createMany({
    data: [
      { id: 1, libelle_service: "Retrait d'argent / Mobile Money", id_entreprise: entreprise.id },
      { id: 2, libelle_service: "Envoi ou r\xE9ception de colis", id_entreprise: entreprise.id },
      { id: 3, libelle_service: "Op\xE9ration \xC9pargne / D\xE9p\xF4t", id_entreprise: entreprise.id }
    ],
    skipDuplicates: true
  });
  console.log("Liaison par d\xE9faut des crit\xE8res aux services...");
  for (const sId of [1, 2, 3]) {
    for (const cId of [1, 2, 3]) {
      await prismaClient.critereService.upsert({
        where: { id_critere_id_service: { id_critere: cId, id_service: sId } },
        update: {},
        create: {
          id_critere: cId,
          id_service: sId,
          ordre: cId
        }
      });
    }
  }
  console.log("Activation des crit\xE8res pour l'agence unique...");
  for (const cId of [1, 2, 3]) {
    await prismaClient.agenceCritere.upsert({
      where: { id_agence_id_critere: { id_agence: agence.id, id_critere: cId } },
      update: {},
      create: {
        id_agence: agence.id,
        id_critere: cId
      }
    });
  }
  console.log("Cr\xE9ation des canaux de communication...");
  await prismaClient.canal.createMany({
    data: [
      { id: 1, type_canal: "QR_WEB", langue_utilisee: "Fran\xE7ais" },
      { id: 2, type_canal: "USSD", langue_utilisee: "Dioula" },
      { id: 3, type_canal: "IVR_VOCAL", langue_utilisee: "Baoul\xE9" }
    ],
    skipDuplicates: true
  });
  const userExistant = await prismaClient.user.findFirst({
    where: { email: EMAIL_CHEF }
  });
  if (!userExistant) {
    console.log(`Cr\xE9ation du compte CHEF_AGENCE : ${EMAIL_CHEF}...`);
    const motDePasseInitial = crypto.randomBytes(9).toString("base64url");
    const providerId = createProviderId("email", EMAIL_CHEF);
    const providerData = await sanitizeAndSerializeProviderData({
      hashedPassword: motDePasseInitial,
      isEmailVerified: true,
      emailVerificationSentAt: null,
      passwordResetSentAt: null
    });
    await createUser(providerId, providerData, {
      email: EMAIL_CHEF,
      nom: "Responsable",
      prenom: "Agence",
      role: "CHEF_AGENCE",
      // Ce compte est le seul dont le mot de passe généré automatiquement
      // est directement utilisable pour se connecter (affiché en console).
      // On force son changement dès la première connexion.
      mustChangePassword: true,
      agence: { connect: { id: agence.id } },
      entreprise: { connect: { id: entreprise.id } },
      telephone: "0102030405",
      actif: true,
      isAdmin: false
    });
    console.log(`Compte CHEF_AGENCE cr\xE9\xE9 avec succ\xE8s.`);
    console.log(`Identifiants de premi\xE8re connexion (\xE0 noter et \xE0 changer ensuite) :`);
    console.log(`  E-mail   : ${EMAIL_CHEF}`);
    console.log(`  Password : ${motDePasseInitial}`);
  } else {
    console.log(`Le compte CHEF_AGENCE (${EMAIL_CHEF}) existe d\xE9j\xE0.`);
  }
  for (const table of ["Critere", "Service", "Canal"]) {
    await prismaClient.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
    );
  }
  console.log("S\xE9quences PostgreSQL resynchronis\xE9es (Critere, Service, Canal).");
  console.log("Seeding mono-agence termin\xE9 avec succ\xE8s !");
}
async function seedSuperAdmin(prismaClient) {
  console.log("Seed SUPER_ADMIN \u2014 v\xE9rification\u2026");
  const existant = await prismaClient.user.findFirst({
    where: { platformRole: "SUPER_ADMIN", actif: true },
    select: { id: true, email: true }
  });
  if (existant) {
    console.log(`Un SUPER_ADMIN existe d\xE9j\xE0 (${existant.email ?? existant.id}) \u2014 seed ignor\xE9.`);
    return;
  }
  const EMAIL = process.env.SUPER_ADMIN_EMAIL || "abdoulivo5@gmail.com";
  const dejaPris = await prismaClient.user.findUnique({ where: { email: EMAIL } });
  if (dejaPris) {
    await prismaClient.user.update({
      where: { id: dejaPris.id },
      data: { platformRole: "SUPER_ADMIN", role: "DIRECTION" }
    });
    console.log(`Compte ${EMAIL} existant \xE9lev\xE9 au rang SUPER_ADMIN (installation mono-op\xE9rateur).`);
    return;
  }
  const motDePasse = crypto.randomBytes(9).toString("base64url");
  const providerId = createProviderId("email", EMAIL);
  const providerData = await sanitizeAndSerializeProviderData({
    hashedPassword: motDePasse,
    isEmailVerified: true,
    emailVerificationSentAt: null,
    passwordResetSentAt: null
  });
  const admin = await createUser(providerId, providerData, { email: EMAIL, username: EMAIL });
  await prismaClient.user.update({
    where: { id: admin.id },
    data: {
      nom: "Yeba",
      prenom: "Admin",
      role: null,
      platformRole: "SUPER_ADMIN",
      id_agence: null,
      actif: true,
      isAdmin: true,
      mustChangePassword: true
    }
  });
  console.log(`SUPER_ADMIN cr\xE9\xE9 : ${EMAIL}`);
  console.log(`Password initial : ${motDePasse} (\xE0 changer d\xE8s la premi\xE8re connexion)`);
}

const seeds = {
  seedEntrepriseUnique,
  seedSuperAdmin
};
async function main() {
  const nameOfSeedToRun = process.env.WASP_DB_SEED_NAME;
  if (nameOfSeedToRun) {
    console.log(`Running seed: ${nameOfSeedToRun}`);
  } else {
    console.error("Name of the seed to run not specified!");
  }
  await seeds[nameOfSeedToRun](dbClient);
}
main().then(async () => {
  await dbClient.$disconnect();
}).catch(async (e) => {
  console.error(e);
  await dbClient.$disconnect();
  process.exit(1);
});
//# sourceMappingURL=dbSeed.js.map
