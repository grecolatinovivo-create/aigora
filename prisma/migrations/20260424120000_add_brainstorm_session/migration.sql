-- CreateTable
CREATE TABLE "BrainstormSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "output" TEXT NOT NULL,
    "grokOutput" TEXT,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainstormSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrainstormSession_userId_idx" ON "BrainstormSession"("userId");

-- AddForeignKey
ALTER TABLE "BrainstormSession" ADD CONSTRAINT "BrainstormSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
