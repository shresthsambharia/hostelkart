import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary inline with credentials
cloudinary.config({
  cloud_name: 'du8btw5rr',
  api_key: '427198826631384',
  api_secret: 'u9V6K7x_6jOQjJKZ-Muoi0SGDgk'
});

async function run() {
  try {
    // 2. Upload sample image from Cloudinary's demo domains
    const sampleImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    console.log('[Cloudinary] Uploading sample image...');
    const uploadResult = await cloudinary.uploader.upload(sampleImageUrl);
    
    console.log('[Cloudinary] Upload Success!');
    console.log(`Secure URL: ${uploadResult.secure_url}`);
    console.log(`Public ID: ${uploadResult.public_id}`);

    // 3. Get image details
    console.log('[Cloudinary] Fetching image details...');
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log(`Width: ${details.width}`);
    console.log(`Height: ${details.height}`);
    console.log(`Format: ${details.format}`);
    console.log(`File Size (Bytes): ${details.bytes}`);

    // 4. Transform the image
    // f_auto: Automatic format selection (delivers WebP, AVIF, etc. depending on browser support)
    // q_auto: Automatic quality optimization (compresses image dynamically without visual quality loss)
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      secure: true,
      fetch_format: 'auto',
      quality: 'auto'
    });

    console.log('\nDone! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(`Transformed URL: ${transformedUrl}`);
  } catch (error) {
    console.error('Error during Cloudinary onboarding test:', error);
  }
}

run();
