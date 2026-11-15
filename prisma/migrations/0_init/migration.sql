-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('CUSTOMER', 'STAFF', 'STOCKER', 'ADMIN', 'SALESMAN') NOT NULL DEFAULT 'CUSTOMER',
    `name` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `gstin` VARCHAR(191) NULL,
    `billingAddress` TEXT NULL,
    `deliveryAddress` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL DEFAULT 'Gujarat',
    `pincode` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `salesmanCode` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `salesmanId` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_mobile_key`(`mobile`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_salesmanCode_key`(`salesmanCode`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_mobile_idx`(`mobile`),
    INDEX `User_deletedAt_idx`(`deletedAt`),
    INDEX `User_salesmanId_idx`(`salesmanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'AAC Block',
    `category` VARCHAR(191) NOT NULL DEFAULT 'AAC_BLOCK',
    `brand` VARCHAR(191) NOT NULL DEFAULT 'Swarnim',
    `sizeLabel` VARCHAR(191) NOT NULL,
    `dimensions` VARCHAR(191) NOT NULL,
    `lengthMm` INTEGER NOT NULL DEFAULT 600,
    `heightMm` INTEGER NOT NULL DEFAULT 200,
    `widthMm` INTEGER NOT NULL,
    `cbmPerBlock` DECIMAL(10, 4) NOT NULL,
    `blocksPerCbm` DECIMAL(10, 2) NOT NULL,
    `bagWeightKg` DECIMAL(10, 2) NULL,
    `coverageSqft` DECIMAL(10, 2) NULL,
    `consumptionRate` DECIMAL(10, 4) NULL,
    `jointThicknessMm` DECIMAL(5, 2) NULL DEFAULT 3.0,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gstRate` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    `description` TEXT NULL,
    `productType` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_sizeLabel_idx`(`sizeLabel`),
    INDEX `Product_category_idx`(`category`),
    INDEX `Product_active_idx`(`active`),
    INDEX `Product_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `loadedQuantity` INTEGER NOT NULL DEFAULT 0,
    `totalCbm` DECIMAL(12, 4) NULL,
    `loadedCbm` DECIMAL(12, 4) NULL DEFAULT 0,
    `totalSqft` DECIMAL(12, 2) NULL,
    `hasMortar` BOOLEAN NOT NULL DEFAULT false,
    `hasAdhesive` BOOLEAN NOT NULL DEFAULT false,
    `adhesiveBags` INTEGER NOT NULL DEFAULT 0,
    `rate` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gstRate` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `gstAmount` DECIMAL(14, 2) NOT NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `deliveryAddress` TEXT NOT NULL,
    `requestedDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `pricePerCbm` DECIMAL(12, 2) NULL,
    `pricingRemarks` TEXT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'ASSIGNED', 'LOADING', 'LOADED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `invoiceNo` VARCHAR(191) NULL,
    `dcNumber` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `shareToken` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'PENDING',
    `paidAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `deletedAt` DATETIME(3) NULL,
    `googlePlaceId` VARCHAR(191) NULL,
    `googleMapsUrl` TEXT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `formattedAddress` TEXT NULL,
    `customSiteName` VARCHAR(191) NULL,
    `villageArea` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `nearbyLandmark` TEXT NULL,
    `locationSource` VARCHAR(191) NULL DEFAULT 'MANUAL',
    `salesmanId` VARCHAR(191) NULL,
    `salesmanNameSnapshot` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdByRole` VARCHAR(191) NULL DEFAULT 'CUSTOMER',
    `createdByNameSnapshot` VARCHAR(191) NULL,
    `gstBillingSelected` BOOLEAN NULL DEFAULT false,
    `gstNumber` VARCHAR(191) NULL,
    `gstRegisteredName` VARCHAR(191) NULL,
    `gstTradeName` VARCHAR(191) NULL,
    `gstStatus` VARCHAR(191) NULL,
    `gstState` VARCHAR(191) NULL,
    `assignedStaffId` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `dispatchedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNo_key`(`orderNo`),
    UNIQUE INDEX `Order_invoiceNo_key`(`invoiceNo`),
    UNIQUE INDEX `Order_dcNumber_key`(`dcNumber`),
    UNIQUE INDEX `Order_shareToken_key`(`shareToken`),
    INDEX `Order_status_idx`(`status`),
    INDEX `Order_customerId_idx`(`customerId`),
    INDEX `Order_assignedStaffId_idx`(`assignedStaffId`),
    INDEX `Order_salesmanId_idx`(`salesmanId`),
    INDEX `Order_dcNumber_idx`(`dcNumber`),
    INDEX `Order_createdByRole_idx`(`createdByRole`),
    INDEX `Order_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productType` VARCHAR(191) NOT NULL DEFAULT 'AAC_BLOCK',
    `productName` VARCHAR(191) NOT NULL,
    `sizeLabel` VARCHAR(191) NULL,
    `dimensions` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `loadedQuantity` INTEGER NOT NULL DEFAULT 0,
    `cbmPerUnit` DECIMAL(10, 4) NULL,
    `totalCbm` DECIMAL(12, 4) NULL,
    `loadedCbm` DECIMAL(12, 4) NULL DEFAULT 0,
    `sqftPerUnit` DECIMAL(10, 2) NULL,
    `totalSqft` DECIMAL(12, 2) NULL,
    `rate` DECIMAL(12, 2) NOT NULL,
    `gstRate` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `gstAmount` DECIMAL(14, 2) NOT NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    INDEX `OrderItem_productType_idx`(`productType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transport` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `transporterName` VARCHAR(191) NULL,
    `truckNumber` VARCHAR(191) NOT NULL,
    `driverName` VARCHAR(191) NOT NULL,
    `driverMobile` VARCHAR(191) NOT NULL,
    `expectedDelivery` DATETIME(3) NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Transport_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderEvent` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'ASSIGNED', 'LOADING', 'LOADED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REJECTED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderEvent_orderId_idx`(`orderId`),
    INDEX `OrderEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `mode` ENUM('BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE') NOT NULL,
    `referenceNo` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payment_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `type` ENUM('IN', 'OUT') NOT NULL,
    `quantityDelta` INTEGER NOT NULL,
    `cbmDelta` DECIMAL(14, 4) NULL DEFAULT 0,
    `referenceNo` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `purchasePrice` DECIMAL(12, 2) NULL,
    `sellingPrice` DECIMAL(12, 2) NULL,
    `supplier` VARCHAR(191) NULL,
    `entryDate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_productId_idx`(`productId`),
    INDEX `StockMovement_type_idx`(`type`),
    INDEX `StockMovement_createdAt_idx`(`createdAt`),
    INDEX `StockMovement_entryDate_idx`(`entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageLog` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `messageType` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `messageText` TEXT NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MessageLog_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PushSubscription_endpoint_key`(`endpoint`),
    INDEX `PushSubscription_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `role` ENUM('CUSTOMER', 'STAFF', 'STOCKER', 'ADMIN', 'SALESMAN') NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `link` TEXT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_role_idx`(`role`),
    INDEX `Notification_read_idx`(`read`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationDeliveryLog` (
    `id` VARCHAR(191) NOT NULL,
    `notificationId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `statusCode` INTEGER NULL,
    `error` TEXT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotificationDeliveryLog_userId_idx`(`userId`),
    INDEX `NotificationDeliveryLog_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `description` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeighbridgeSlip` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `rstNumber` VARCHAR(191) NOT NULL,
    `receiptNumber` VARCHAR(191) NULL,
    `weighbridgeName` VARCHAR(191) NOT NULL,
    `slipDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `slipTime` VARCHAR(191) NULL,
    `vehicleNumber` VARCHAR(191) NOT NULL,
    `driverName` VARCHAR(191) NOT NULL,
    `driverMobile` VARCHAR(191) NOT NULL,
    `grossWeightKg` DECIMAL(10, 2) NULL,
    `tareWeightKg` DECIMAL(10, 2) NULL,
    `netWeightKg` DECIMAL(10, 2) NOT NULL,
    `remarks` TEXT NULL,
    `slipUrl` TEXT NULL,
    `fileType` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WeighbridgeSlip_orderId_key`(`orderId`),
    INDEX `WeighbridgeSlip_rstNumber_idx`(`rstNumber`),
    INDEX `WeighbridgeSlip_vehicleNumber_idx`(`vehicleNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoadingRecord` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `driverName` VARCHAR(191) NOT NULL,
    `driverMobile` VARCHAR(191) NOT NULL,
    `vehicleNumber` VARCHAR(191) NOT NULL,
    `transporterName` VARCHAR(191) NULL,
    `vehicleType` VARCHAR(191) NULL,
    `loadingDate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `loadingStartTime` VARCHAR(191) NULL,
    `loadingEndTime` VARCHAR(191) NULL,
    `loadedBlockSize` VARCHAR(191) NULL,
    `loadedCbm` DECIMAL(12, 4) NULL,
    `loadedMortarBags` INTEGER NULL DEFAULT 0,
    `rstNumber` VARCHAR(191) NULL,
    `grossWeight` DECIMAL(10, 2) NULL,
    `tareWeight` DECIMAL(10, 2) NULL,
    `netWeight` DECIMAL(10, 2) NULL,
    `remarks` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LoadingRecord_orderId_key`(`orderId`),
    INDEX `LoadingRecord_vehicleNumber_idx`(`vehicleNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderEditHistory` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `changedById` VARCHAR(191) NULL,
    `changedByName` VARCHAR(191) NULL,
    `userRole` VARCHAR(191) NOT NULL,
    `previousValues` JSON NOT NULL,
    `newValues` JSON NOT NULL,
    `changedFields` JSON NOT NULL,
    `orderVersion` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderEditHistory_orderId_idx`(`orderId`),
    INDEX `OrderEditHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyProfile` (
    `id` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL DEFAULT 'SWARNIM AAC BLOCK PRIVATE LIMITED',
    `tradeName` VARCHAR(191) NOT NULL DEFAULT 'SWARNIM AAC BLOCK PRIVATE LIMITED',
    `gstin` VARCHAR(191) NOT NULL DEFAULT '24ABNCS5280K1ZU',
    `constitution` VARCHAR(191) NOT NULL DEFAULT 'Private Limited Company',
    `registeredAddress` VARCHAR(500) NOT NULL DEFAULT 'Office No. 615, D-6th Floor, Ganesh Glory 11, Jagatpur Chenpur Road, Ahmedabad, Gujarat - 382470',
    `state` VARCHAR(191) NOT NULL DEFAULT 'Gujarat',
    `district` VARCHAR(191) NOT NULL DEFAULT 'Ahmedabad',
    `registrationDate` VARCHAR(191) NOT NULL DEFAULT '07/08/2024',
    `registrationType` VARCHAR(191) NOT NULL DEFAULT 'Regular',
    `contactPerson` VARCHAR(191) NULL,
    `companyMobile` VARCHAR(191) NULL,
    `altMobile` VARCHAR(191) NULL,
    `companyEmail` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `factoryAddress` TEXT NULL,
    `factoryContact` VARCHAR(191) NULL,
    `factoryName` VARCHAR(191) NULL DEFAULT 'Swarnim AAC Manufacturing Plant & Yard',
    `yardAddress` TEXT NULL,
    `factoryCity` VARCHAR(191) NULL,
    `factoryDistrict` VARCHAR(191) NULL,
    `factoryState` VARCHAR(191) NULL DEFAULT 'Gujarat',
    `factoryPincode` VARCHAR(191) NULL,
    `factoryMapsUrl` TEXT NULL,
    `officeAddress` TEXT NULL,
    `signatoryName` VARCHAR(191) NULL,
    `logoUrl` TEXT NULL,
    `stampUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryChallanSequence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `currentValue` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `salesmanId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `registeredCustomerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerInvitation_token_key`(`token`),
    INDEX `CustomerInvitation_salesmanId_idx`(`salesmanId`),
    INDEX `CustomerInvitation_token_idx`(`token`),
    INDEX `CustomerInvitation_mobile_idx`(`mobile`),
    INDEX `CustomerInvitation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerAssignmentHistory` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `fromSalesmanId` VARCHAR(191) NULL,
    `toSalesmanId` VARCHAR(191) NULL,
    `assignedById` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerAssignmentHistory_customerId_idx`(`customerId`),
    INDEX `CustomerAssignmentHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_assignedStaffId_fkey` FOREIGN KEY (`assignedStaffId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transport` ADD CONSTRAINT `Transport_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderEvent` ADD CONSTRAINT `OrderEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderEvent` ADD CONSTRAINT `OrderEvent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageLog` ADD CONSTRAINT `MessageLog_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageLog` ADD CONSTRAINT `MessageLog_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeighbridgeSlip` ADD CONSTRAINT `WeighbridgeSlip_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoadingRecord` ADD CONSTRAINT `LoadingRecord_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderEditHistory` ADD CONSTRAINT `OrderEditHistory_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerInvitation` ADD CONSTRAINT `CustomerInvitation_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerAssignmentHistory` ADD CONSTRAINT `CustomerAssignmentHistory_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
