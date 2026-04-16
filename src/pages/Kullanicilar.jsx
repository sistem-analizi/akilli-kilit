import { useState, useEffect } from 'react';
import { ref, onValue, set, remove, update, get } from 'firebase/database';
import { db } from '../firebase';

export default function Kullanicilar() {
  const [kullanicilar, setKullanicilar] = useState([]);
  
  // Hangi satırın 3 nokta menüsü açık?
  const [acikMenuId, setAcikMenuId] = useState(null);

  // ARAMA VE MENÜ STATE'LERİ
  const [aramaMetni, setAramaMetni] = useState('');
  
  // Modallar için State'ler
  const [isEkleModalOpen, setIsEkleModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [seciliKullanici, setSeciliKullanici] = useState(null);
  
  // Form State'leri
  const [ekleForm, setEkleForm] = useState({ Ad: '', Email: '', Sifre: '' });
  const [editForm, setEditForm] = useState({ Ad: '', Email: '', Sifre: '' });
  const [pinForm, setPinForm] = useState({ pin: '', baslangic: '', bitis: '' });
  const [mesaj, setMesaj] = useState({ tip: '', metin: '' });
  // PIN atama modalı için ayrı mesaj state'i
  const [pinMesaj, setPinMesaj] = useState({ tip: '', metin: '' });


  useEffect(() => {
    const kullanicilarRef = ref(db, 'KilitSistemi/Kullanicilar');
    onValue(kullanicilarRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liste = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setKullanicilar(liste);
      } else { setKullanicilar([]); }
    });
  }, []);

  // --- FİLTRELEME MANTIĞI ---
  const filtrelenmisKullanicilar = kullanicilar.filter((user) => {
    return user.Ad.toLowerCase().includes(aramaMetni.toLowerCase()) || 
           user.Email.toLowerCase().includes(aramaMetni.toLowerCase());
  });

  // --- YENİ KULLANICI EKLEME ---
  const handleKullaniciEkle = async (e) => {
    e.preventDefault();
    const yeniId = `uid_${Date.now()}`; // Otomatik benzersiz ID oluştur
    try {
      await set(ref(db, `KilitSistemi/Kullanicilar/${yeniId}`), ekleForm);
      setMesaj({ tip: 'basari', metin: 'Yeni kullanıcı başarıyla eklendi!' });
      setIsEkleModalOpen(false);
      setEkleForm({ Ad: '', Email: '', Sifre: '' }); // Formu temizle
      setTimeout(() => setMesaj({ tip: '', metin: '' }), 2000);
    } catch (error) { 
        console.error("Kullanıcı ekleme hatası:", error);
        setMesaj({ tip: 'hata', metin: 'Kullanıcı eklenemedi.' }); }
  };

  // --- SİLME İŞLEMİ ---
  const handleKullaniciSil = async (id) => {
    if (window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
      try {
        await remove(ref(db, `KilitSistemi/Kullanicilar/${id}`));
        setAcikMenuId(null); // Menüyü kapat
      } catch (error) { 
        console.error("Kullanıcı silme hatası:", error);
        alert("Silme hatası!");
      }
    }
  };

  // --- GÜNCELLEME İŞLEMİ ---
  const handleGuncelle = async (e) => {
    e.preventDefault();
    try {
      await update(ref(db, `KilitSistemi/Kullanicilar/${seciliKullanici.id}`), editForm);
      setMesaj({ tip: 'basari', metin: 'Bilgiler güncellendi!' });
      setIsEditModalOpen(false);
      setTimeout(() => setMesaj({ tip: '', metin: '' }), 2000);
    } catch (error) { 
      console.error("Kullanıcı güncelleme hatası:", error);
      setMesaj({ tip: 'hata', metin: 'Güncelleme başarısız.' }); }
  };

  // --- PIN (ŞİFRE ATA) İŞLEMİ ---
  const handlePinAta = async (e) => {
    e.preventDefault();
    try {
        if (!/^\d{4}$/.test(pinForm.pin)) {
          setPinMesaj({ tip: 'hata', metin: 'PIN kodu 4 haneli sayı olmalıdır.' });    
          return;
        }

        if (new Date(pinForm.baslangic) >= new Date(pinForm.bitis)) {
          setPinMesaj({ tip: 'hata', metin: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır.' });
          return;
        }   

      await set(ref(db, `KilitSistemi/Sifreler/${pinForm.pin}`), {
        UserID: seciliKullanici.id,
        KullaniciAdi: seciliKullanici.Ad,
        Baslangic: pinForm.baslangic.replace("T", " "),
        Bitis: pinForm.bitis.replace("T", " ")
      });
      setMesaj({ tip: 'basari', metin: 'PIN başarıyla atandı!' });
      setIsPinModalOpen(false);
      setPinForm({ pin: '', baslangic: '', bitis: '' }); // Formu temizle
      setTimeout(() => setMesaj({ tip: '', metin: '' }), 2000);
    } catch (error) { 
      console.error("PIN atama hatası:", error);
      setMesaj({ tip: 'hata', metin: 'PIN atama hatası.' }); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 relative">
      
     {/* ÜST BAŞLIK VE AKSİYONLAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-gray-500">Sistemdeki tüm kayıtlı kullanıcılar</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          {/* ARAMA ÇUBUĞU */}
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="İsim veya e-posta ile ara..." 
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <button 
            onClick={() => setIsEkleModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            + Yeni Ekle
          </button>
        </div>
      </div>

      {/* MESAJ KUTUSU */}
      {mesaj.metin && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${mesaj.tip === 'basari' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {mesaj.metin}
        </div>
      )}

      {/* KULLANICI TABLOSU */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-gray-500 text-sm bg-gray-50">
              <th className="py-3 px-4">Ad Soyad</th>
              <th className="py-3 px-4">E-posta</th>
              <th className="py-3 px-4">Giriş Şifresi</th>
              <th className="py-3 px-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtrelenmisKullanicilar.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-400">
                  {kullanicilar.length === 0 ? "Henüz kullanıcı yok." : "Arama kriterine uygun kullanıcı bulunamadı."}
                </td>
              </tr>
            ) : (
              filtrelenmisKullanicilar.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50 transition">
                  <td className="py-4 px-4 font-medium text-gray-800">{u.Ad}</td>
                  <td className="py-4 px-4 text-gray-600">{u.Email}</td>
                  <td className="py-4 px-4 text-gray-600 font-mono">{u.Sifre || '---'}</td>
                  <td className="py-4 px-4 text-right relative">
                    <button onClick={() => setAcikMenuId(acikMenuId === u.id ? null : u.id)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {acikMenuId === u.id && (
                      <div className="absolute right-12 top-10 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-xl z-10 py-1 overflow-hidden">
                        <button onClick={() => { setSeciliKullanici(u); setIsPinModalOpen(true); setAcikMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">PIN Ata</button>
                        <button onClick={() => { setSeciliKullanici(u); setEditForm({ Ad: u.Ad, Email: u.Email, Sifre: u.Sifre || '' }); setIsEditModalOpen(true); setAcikMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Düzenle</button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={() => handleKullaniciSil(u.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Kullanıcıyı Sil</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* YENİ KULLANICI EKLE MODALI */}
      {isEkleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Yeni Kullanıcı Ekle</h3>
            <form onSubmit={handleKullaniciEkle} className="space-y-4">
              <input type="text" required value={ekleForm.Ad} onChange={e => setEkleForm({...ekleForm, Ad: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ad Soyad" />
              <input type="email" required value={ekleForm.Email} onChange={e => setEkleForm({...ekleForm, Email: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="E-posta Adresi" />
              <input type="text" value={ekleForm.Sifre} onChange={e => setEkleForm({...ekleForm, Sifre: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Kullanıcı Şifresi" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEkleModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200">İptal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700">Kullanıcıyı Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DÜZENLEME MODALI */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Bilgileri Düzenle</h3>
            <form onSubmit={handleGuncelle} className="space-y-4">
              <input type="text" required value={editForm.Ad} onChange={e => setEditForm({...editForm, Ad: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ad Soyad" />
              <input type="email" required value={editForm.Email} onChange={e => setEditForm({...editForm, Email: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Email" />
              <input type="text" value={editForm.Sifre} onChange={e => setEditForm({...editForm, Sifre: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Şifre" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200">İptal</button>
                <button type="submit" className="flex-1 bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN ATA MODALI */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800">{seciliKullanici?.Ad} İçin PIN Ata</h3>
            {pinMesaj.metin && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${pinMesaj.tip === 'basari' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {pinMesaj.metin}
        </div>
      )}
            <form onSubmit={handlePinAta} className="space-y-4">
              <input type="number" required onChange={e => setPinForm({...pinForm, pin: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Kapı PIN Kodu (Örn: 1453)" />
              <input type="datetime-local" required onChange={e => setPinForm({...pinForm, baslangic: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="datetime-local" required onChange={e => setPinForm({...pinForm, bitis: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsPinModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200">İptal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700">PIN Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}