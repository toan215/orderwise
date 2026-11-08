// Minimal seed that lets local dev start with a shop, owner and a demo product.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL || 'owner@orderwise.dev';
  const password = process.env.SEED_OWNER_PASSWORD || 'Orderwise123!';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      fullName: 'Demo Owner',
    },
  });

  const shop = await prisma.shop.upsert({
    where: { slug: 'demo-shop' },
    update: {},
    create: { name: 'Demo Shop', slug: 'demo-shop' },
  });

  await prisma.shopMember.upsert({
    where: { shopId_userId: { shopId: shop.id, userId: user.id } },
    update: {},
    create: { shopId: shop.id, userId: user.id, role: 'OWNER' },
  });

  const product = await prisma.product.create({
    data: {
      shopId: shop.id,
      name: 'Áo thun cotton',
      sku: 'TEE-COTTON',
    },
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: 'TEE-COTTON-WHITE-L',
      name: 'Trắng / L',
      price: 150000,
      optionValues: JSON.stringify([{ option: 'Màu', value: 'Trắng' }, { option: 'Size', value: 'L' }]),
    },
  });

  await prisma.inventoryItem.create({
    data: {
      shopId: shop.id,
      variantId: variant.id,
      onHand: 20,
    },
  });

  console.log('Seeded: user=%s shop=%s', user.email, shop.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
