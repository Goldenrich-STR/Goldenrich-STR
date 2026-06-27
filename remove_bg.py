from PIL import Image
import numpy as np

# Open the logo
img = Image.open('frontend/public/logo.png').convert('RGBA')
data = np.array(img)

# Get RGBA channels
r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

# Define "white-ish" threshold — pixels that are very light / near white
# Making threshold 230 to catch off-white as well
threshold = 230

# Find pixels that are near white (all channels high)
white_mask = (r > threshold) & (g > threshold) & (b > threshold)

# Set those pixels to transparent
data[white_mask] = [0, 0, 0, 0]

# Save result
result = Image.fromarray(data)
result.save('frontend/public/logo_transparent.png', 'PNG')
print("Done! Saved as logo_transparent.png")
