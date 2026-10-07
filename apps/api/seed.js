const { PrismaClient, MemberStatus } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

const permissions = [
  "instance.read",
  "instance.create",
  "instance.control",
  "member.read",
  "member.create",
  "member.update",
  "role.read",
  "role.manage",
  "message.read",
  "message.send",
  "contact.read",
  "contact.manage",
  "audit.read",
  "api-key.read",
  "api-key.manage",
  "ai-agent.read",
  "ai-agent.manage",
  "ai-agent.execute",
  "agent-knowledge.read",
  "agent-knowledge.manage",
  "ai-agent-session.read",
  "ai-agent-session.manage",
  "ai-agent-execution.read",
];

async function main() {
  const email = "admin@service-waha.local";
  const passwordHash = await hash("ServiceWaha123!", 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Default Admin", passwordHash, isSuperAdmin: true },
    create: {
      email,
      name: "Default Admin",
      passwordHash,
      isSuperAdmin: true,
    },
  });
  const tenant = await prisma.tenant.upsert({
    where: { slug: "default-workspace" },
    update: { name: "Default Workspace" },
    create: { name: "Default Workspace", slug: "default-workspace" },
  });
  const member = await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { status: MemberStatus.ACTIVE },
    create: { tenantId: tenant.id, userId: user.id, status: MemberStatus.ACTIVE },
  });
  const role = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "owner" } },
    update: { description: "Default workspace owner" },
    create: {
      tenantId: tenant.id,
      name: "owner",
      description: "Default workspace owner",
    },
  });
  await prisma.memberRole.upsert({
    where: { memberId_roleId: { memberId: member.id, roleId: role.id } },
    update: {},
    create: { memberId: member.id, roleId: role.id },
  });
  for (const key of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  console.log(`Default user seeded: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
