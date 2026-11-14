const Supabase = (() => {
  let supabase;
  const bucketName = "files";
  const basePath = `projects/${PROJECT_NAME}`;

  function init() {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      accessToken: async () => {
        if (!currentAuthUser) return null;

        // Get the fresh Firebase JWT
        return await currentAuthUser.getIdToken();
      },
    });
  }

  async function uploadFile(file, path) {
    try {
      path = `${basePath}/${currentUser.id}${path}`;

      const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // Get the Public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);

      console.log("Supabase: File uploaded successfully.");
      return publicUrlData.publicUrl;
    } catch (error) {
      handleError(error);
    }
  }

  async function removeFile(path = "") {
    try {
      path = `${basePath}/${currentUser.id}${path}`;

      const { data: removeData, error: removeError } = await supabase.storage.from(bucketName).remove([path]);

      if (removeError) throw new Error(removeError.message);

      console.log("Supabase: File removed successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteStorageItem(path = "") {
    try {
      path = `${basePath}/${currentUser.id}${path}`;

      await SupabaseUtils.deleteStorageItem(supabase, bucketName, path);

      console.log("Supabase: Storage item deleted successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  return { init, uploadFile, deleteStorageItem };
})();

const Firebase = (() => {
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDezBJ6jJPPNShWz2F1Dlr_g9YmiygpKAo",
    authDomain: "global-203b0.firebaseapp.com",
    projectId: "global-203b0",
    storageBucket: "global-203b0.firebasestorage.app",
    messagingSenderId: "517320930372",
    appId: "1:517320930372:web:41b6fc0212fae647a37811",
  };

  let app;
  let db;
  let auth;

  let unsubscribe = { posts: null, users: null, user: null };

  globalThis.currentAuthUser = null;

  // Initialize Firebase
  function init() {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      globalThis.currentAuthUser = user;
      console.log("currentAuthUser:", currentAuthUser);
      updateUI();
    });
  }

  function collection(name) {
    return db.collection(`projects/${PROJECT_NAME}/${name}`);
  }

  async function docExists(collectionName, id) {
    const docSnap = await collection(collectionName).doc(id).get();
    if (!docSnap.exists) return false;
    return true;
  }

  function getUserName() {
    const user = currentUser;
    return user.name || user.displayName || user.email || "Anonymous User";
  }

  function getUserAvatarUrl() {
    return currentUser.avatarUrl || currentUser.photoURL || null;
  }

  async function syncCurrentUser() {
    try {
      const userId = currentAuthUser.uid;
      const userRef = collection("users").doc(userId);
      const docSnap = await userRef.get();

      let userData = {
        id: userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (docSnap.exists) {
        const docData = docSnap.data();
        userData = { ...userData, ...docData };
      } else {
        userData = {
          ...userData,
          name: currentAuthUser.displayName || generateUserName(userId),
          email: currentAuthUser.email,
        };
      }

      await userRef.set(userData, { merge: true });
      currentUser = userData;
    } catch (error) {
      handleError(error);
    }
  }

  async function login(data) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(data.email, data.password);
      notify("Logged in successfully.");
      return userCredential.user;
    } catch (error) {
      handleError(error);
    }
  }

  async function loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const userCredential = await auth.signInWithPopup(provider);

      notify("Logged in successfully.");
      return userCredential.user;
    } catch (error) {
      handleError(error);
    }
  }

  async function signup(data) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(data.email, data.password);
      const user = userCredential.user;
      await user.sendEmailVerification();

      notify("Account created successfully.");
      return user;
    } catch (error) {
      handleError(error);
    }
  }

  async function logout() {
    try {
      await auth.signOut();
      notify("Logged out successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function getUser(userId) {
    try {
      const docSnap = await collection("users").doc(userId).get();

      if (docSnap.exists) {
        const docData = docSnap.data();
        const user = { id: docSnap.id, ...docData };

        return user;
      }

      return null;
    } catch (error) {
      handleError(error);
    }
  }

  function loadUser(userId, onLoaded) {
    const userRef = collection("users").doc(userId);

    if (unsubscribe[`user${userId}`]) unsubscribe[`user${userId}`]();
    unsubscribe[`user${userId}`] = userRef.onSnapshot(
      (snapshot) => {
        if (snapshot.exists) {
          const docData = snapshot.data();
          const user = { id: snapshot.id, email: currentUser.email, ...docData };

          onLoaded(user);
        }
      },
      (error) => handleError(error),
    );
  }

  function loadCurrentUser() {
    const userId = currentUser.id;
    const userRef = collection("users").doc(userId);

    if (unsubscribe.currentUser) unsubscribe.currentUser();
    unsubscribe.currentUser = userRef.onSnapshot(
      (snapshot) => {
        if (snapshot.exists) {
          const docData = snapshot.data();
          const user = { id: snapshot.id, email: currentUser.email, ...docData };

          currentUser = user;
          updateUI();
        }
      },
      (error) => handleError(error),
    );
  }

  function loadUsers(onLoaded) {
    if (unsubscribe.users) unsubscribe.users();
    unsubscribe.users = collection("users")
      .orderBy("timestamp", "desc")
      .limit(10)
      .onSnapshot(
        (snapshot) => {
          const users = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          onLoaded(users);
        },
        (error) => handleError(error),
      );
  }

  async function setUser(userId, data) {
    const userRef = collection("users").doc(userId);

    let { avatarFile, bannerFile, ...userData } = data;

    if (avatarFile) {
      userData.avatarUrl = await Supabase.uploadFile(avatarFile, "/profile/avatar.png");
    }
    if (bannerFile) {
      userData.bannerUrl = await Supabase.uploadFile(bannerFile, "/profile/banner.png");
    }

    try {
      // 3. Save user data and avatar URL to Firebase Firestore
      await userRef.set(
        {
          ...userData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      notify("User updated successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteUser(userId) {
    const userRef = collection("users").doc(userId);

    try {
      // Query and delete all data associated with this user
      const postsQS = await collection("posts").where("authorId", "==", userId).get();

      const batch = db.batch();

      // Add all posts to the batch
      postsQS.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Add the user doc to the same batch
      batch.delete(userRef);

      // Commit all deletions together
      await batch.commit();

      // Delete the user from Firebase Authentication
      await auth.currentUser.delete();

      await Supabase.deleteStorageItem();

      notify("User deleted successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function getDocument(path) {
    try {
      const docSnap = await db.doc(path).get();

      if (docSnap.exists) {
        const docData = docSnap.data();
        const document = { id: docSnap.id, ...docData, path: docSnap.ref.path };

        return document;
      }

      return null;
    } catch (error) {
      handleError(error);
    }
  }

  async function getDocuments(collectionPath) {
    try {
      const documentsQS = await db.collection(collectionPath).get();

      const documents = documentsQS.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      return documents;
    } catch (error) {
      handleError(error);
    }
  }

  function loadDocuments(collectionPath, onLoaded) {
    let documentsRef = db.collection(collectionPath);

    if (unsubscribe.documents) unsubscribe.documents();
    unsubscribe.documents = documentsRef.onSnapshot(
      (snapshot) => {
        let documents = [];
        snapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data(), path: doc.ref.path });
        });

        onLoaded(documents);
      },
      (error) => {
        handleError(error);
      },
    );
  }

  async function setDocument(path, data) {
    try {
      const docRef = db.doc(path);

      data.timestamp = firebase.firestore.FieldValue.serverTimestamp();

      await docRef.set(data);

      notify("Document updated successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteDocument(path) {
    try {
      const docRef = db.doc(path);
      await docRef.delete();

      notify("Document deleted successfully.");
      return true;
    } catch (error) {
      handleError(error);
    }
  }

  async function listCollections(documentPath) {
    try {
      const encodedPath = encodeURIComponent(documentPath);
      const apiUrl = `https://kgdee-firebase-functions.netlify.app/.netlify/functions/list-collections?path=${encodedPath}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      return data.collections;
    } catch (error) {
      handleError(error);
    }
  }

  async function deleteItem(path) {
    try {
      if (!currentAuthUser) {
        throw new Error("Failed to delete item: Authentication required.");
      }

      // Get the Firebase ID token (forces a refresh if expired)
      const token = await currentAuthUser.getIdToken();
      const url = `https://kgdee-firebase-functions.netlify.app/.netlify/functions/delete-store-item?path=${encodeURIComponent(path)}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item.");
      }

      notify("Item deleted successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function createPost(data) {
    try {
      const id = generateId();
      const { imageFile, ...postData } = data;

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await Supabase.uploadFile(imageFile, `/posts/${id}/image.png`);
      }

      await collection("posts")
        .doc(id)
        .set({
          authorId: currentUser.id,
          authorName: getUserName(),
          content: postData.content || "",
          ...(imageUrl ? { imageUrl } : {}),
          avatarUrl: getUserAvatarUrl(),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

      notify("Post created successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function getPost(postId) {
    try {
      const docSnap = await collection("posts").doc(postId).get();

      if (docSnap.exists) {
        const docData = docSnap.data();
        const post = { id: docSnap.id, ...docData };

        return post;
      }

      return null;
    } catch (error) {
      handleError(error);
    }
  }

  async function setPost(id, data) {
    try {
      const { imageFile, ...postData } = data;

      if (imageFile) {
        postData.imageUrl = await Supabase.uploadFile(imageFile, `/posts/${id}/image.png`);
      }

      await collection("posts")
        .doc(id)
        .set(
          {
            ...postData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      notify("Post updated successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  async function deletePost(postId) {
    try {
      const postRef = collection("posts").doc(postId);
      const batch = db.batch();

      // Query and delete documents in root collections where postId matches
      const [commentsQS, reactionsQS, sharesQS] = await Promise.all([
        collection("comments").where("postId", "==", postId).get(),
        collection("reactions").where("postId", "==", postId).get(),
        collection("shares").where("postId", "==", postId).get(),
      ]);

      commentsQS.docs.forEach((doc) => batch.delete(doc.ref));
      reactionsQS.docs.forEach((doc) => batch.delete(doc.ref));
      sharesQS.docs.forEach((doc) => batch.delete(doc.ref));

      // Delete the post document itself
      batch.delete(postRef);

      // Commit all deletions in a single batch
      await batch.commit();

      await Supabase.deleteStorageItem(`/posts/${postId}`);

      notify("Post deleted successfully.");
    } catch (error) {
      handleError(error);
    }
  }

  return {
    auth,
    init,
    syncCurrentUser,
    loginWithGoogle,
    signup,
    logout,
    getUser,
    loadUser,
    loadCurrentUser,
    loadUsers,
    setUser,
    deleteUser,
    createPost,
    getPost,
    getDocument,
    getDocuments,
    loadDocuments,
    setDocument,
    deleteDocument,
    listCollections,
    deleteItem,
    setPost,
    deletePost,
  };
})();
