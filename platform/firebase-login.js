import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth, GithubAuthProvider, signInWithPopup} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

const app=initializeApp({
  apiKey:'AIzaSyDTcGhpCiH5DvgxBqEZslhFnpAf8ULqFwI',
  authDomain:'thorscorsv04.firebaseapp.com',
  projectId:'thorscorsv04',
  appId:'1:655007055435:web:9f589f2527adc9587997ce'
});
const auth=getAuth(app);
export async function githubToken(){
  const result=await signInWithPopup(auth,new GithubAuthProvider());
  return result.user.getIdToken(true);
}
