import os
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
import seaborn as sns
import glob

from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPool2D, Flatten, Dense, Dropout
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import GlobalAveragePooling2D

# -------------------------------
# 1. DOWNLOAD DATASET
# -------------------------------
dataset_url = "https://storage.googleapis.com/download.tensorflow.org/example_images/flower_photos.tgz"

path = tf.keras.utils.get_file(
    'flower_photos',
    origin=dataset_url,
    untar=True
)

print("Dataset path:", path)

# -------------------------------
# 2. CLASSES
# -------------------------------
classes = [
    'daisy',
    'dandelion',
    'roses',
    'sunflowers',
    'tulips'
]

data = []
labels = []

# -------------------------------
# 3. LOAD DATA
# -------------------------------
for idx, category in enumerate(classes):
    folder = os.path.join(path, "flower_photos", category)

    image_files = glob.glob(folder + "/*.*")
    print(f"{category} images found:", len(image_files))

    for img_path in image_files:
        try:
            img = tf.keras.preprocessing.image.load_img(
                img_path,
                target_size=(224,224)
            )
            img = np.array(img)

            data.append(img)
            labels.append(idx)
        except:
            pass

# -------------------------------
# 4. CONVERT PROPERLY (FIXED PART)
# -------------------------------
data = np.array(data, dtype=np.float32)
labels = np.array(labels)

labels = to_categorical(labels, num_classes=5)

print("Final data shape:", data.shape)
print("Final labels shape:", labels.shape)

# -------------------------------
# 5. TRAIN TEST SPLIT
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    data, labels, test_size=0.2, random_state=42
)

# -------------------------------
# 6. NORMALIZE (FIXED)
# -------------------------------
X_train = X_train.astype("float32") / 255.0
X_test = X_test.astype("float32") / 255.0

# -------------------------------
# 7. MODEL (EfficientNetB0)
# -------------------------------

base_model = EfficientNetB0(
    weights='imagenet',
    include_top=False,
    input_shape=(224, 224, 3)
)

base_model.trainable = False

model = Sequential([
    base_model,
    GlobalAveragePooling2D(),
    Dense(256, activation='relu'),
    Dropout(0.5),
    Dense(5, activation='softmax')
])

# -------------------------------
# 8. COMPILE
# -------------------------------
model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# -------------------------------
# 9. TRAIN
# -------------------------------
history = model.fit(
    X_train, y_train,
    epochs=20,
    batch_size=32,
    validation_data=(X_test, y_test)
)

# -------------------------------
# 10. EVALUATE
# -------------------------------
loss, acc = model.evaluate(X_test, y_test)
print("Accuracy:", acc)

# -------------------------------
# 11. CONFUSION MATRIX
# -------------------------------
y_pred = model.predict(X_test)
y_pred_classes = np.argmax(y_pred, axis=1)
y_true = np.argmax(y_test, axis=1)

cm = confusion_matrix(y_true, y_pred_classes)

plt.figure(figsize=(6,6))
sns.heatmap(cm, annot=True, cmap="Reds",
            xticklabels=classes,
            yticklabels=classes)

plt.title("Confusion Matrix")
plt.show()

# -------------------------------
# 12. SAMPLE PREDICTIONS
# -------------------------------
plt.figure(figsize=(10,10))

for i in range(9):
    plt.subplot(3,3,i+1)
    plt.imshow(X_test[i])
    plt.title(f"True: {classes[y_true[i]]}\nPred: {classes  [y_pred_classes[i]]}")
    plt.axis('off')

plt.show()
plt.show()

# Save model
model.save("flower_model.h5")

print("Model saved successfully!")