import { S3Client, PutObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

async function checkS3() {
    console.log("Checking S3 Configuration...");
    console.log("Region:", process.env.AWS_REGION);
    console.log("Bucket:", process.env.S3_BUCKET);
    console.log("AccessKey:", process.env.AWS_ACCESS_KEY_ID ? "****" + process.env.AWS_ACCESS_KEY_ID.slice(-4) : "MISSING");

    try {
        console.log("Listing buckets...");
        const data = await s3Client.send(new ListBucketsCommand({}));
        console.log("Success. Buckets:", data.Buckets?.map(b => b.Name).join(", "));
    } catch (err) {
        console.error("Error listing buckets:", err);
    }

    try {
        console.log("Attempting upload...");
        const bucket = process.env.S3_BUCKET;
        if (!bucket) throw new Error("S3_BUCKET not set");

        const key = `debug-test-${Date.now()}.txt`;
        await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: "Test upload content",
            ContentType: "text/plain",
        }));
        console.log(`Successfully uploaded to ${bucket}/${key}`);
    } catch (err) {
        console.error("Error uploading:", err);
    }
}

checkS3();
