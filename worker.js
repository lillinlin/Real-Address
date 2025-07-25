addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const { searchParams } = new URL(request.url)
  // 默认国家设置为澳大利亚
  const country = searchParams.get('country') || 'AU'
  let address, name, gender, phone

  for (let i = 0; i < 100; i++) {
    const location = getRandomLocationInCountry(country)
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`

    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Cloudflare Worker' }
    })
    const data = await response.json()

    if (data && data.address && data.address.house_number && data.address.road && (data.address.city || data.address.town)) {
      address = formatAddress(data.address, country)
      break
    }
  }

  if (!address) {
    return new Response('Failed to retrieve detailed address, please refresh the interface （检索详细地址失败，请刷新界面）', { status: 500 })
  }

  const userData = await fetch('https://randomuser.me/api/')
  const userJson = await userData.json()
  if (userJson && userJson.results && userJson.results.length > 0) {
    const user = userJson.results[0]
    name = `${user.name.first} ${user.name.last}`
    gender = user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
    phone = getRandomPhoneNumber(country)
  } else {
    name = getRandomName()
    gender = "Unknown"
    phone = getRandomPhoneNumber(country)
  }

const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Real Address Generator</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      min-height: 100vh;
      background-color: #f0f0f0;
      margin: 0;
    }
    .container {
      text-align: center;
      background: white;
      padding: 20px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      width: 90%;
      max-width: 600px;
      margin: 20px;
      box-sizing: border-box;
      position: relative;
    }
    .name, .gender, .phone, .address {
      font-size: 1.5em;
      margin-bottom: 10px;
      cursor: pointer;
    }
    .refresh-btn {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin-bottom: 20px;
    }
    .refresh-btn:hover {
      background-color: #0056b3;
    }
    .country-select {
      margin-bottom: 20px;
    }
    .map {
      width: 100%;
      height: 400px;
      border: 0;
    }
    .title {
      font-size: 2em;
      margin: 20px 0;
    }
    .subtitle {
      font-size: 1.5em;
      margin-bottom: 20px;
    }
    .footer {
      margin-top: auto;
      padding: 10px 0;
      background-color: #f0f0f0;
      width: 100%;
      text-align: center;
      font-size: 0.9em;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .copied {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #28a745;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      display: none;
    }
    .subtitle-small {
      font-size: 1.2em; 
      margin-bottom: 20px;
    } 
    .saved-addresses {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .saved-addresses th, .saved-addresses td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
    }
    .saved-addresses th {
      background-color: #f2f2f2;
    }
    .delete-btn {
      padding: 5px 10px;
      background-color: #dc3545;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }
    .delete-btn:hover {
      background-color: #c82333;
    }   
  </style>
</head>
<body>
  <div class="title">Real Address Generator</div>
  <div class="subtitle">真实地址生成器</div>
  <div class="subtitle-small">Click to copy information（点击即可复制信息）</div>
  <div class="container">
    <div class="copied" id="copied">Copied!</div>
    <div class="name" onclick="copyToClipboard('${name}')">${name}</div>
    <div class="gender" onclick="copyToClipboard('${gender}')">${gender}</div>
    <div class="phone" onclick="copyToClipboard('${phone.replace(/[()\\s-]/g, '')}')">${phone}</div>
    <div class="address" onclick="copyToClipboard('${address}')">${address}</div>
    <button class="refresh-btn" onclick="window.location.reload();">Get Another Address 获取新地址</button>
    <button class="refresh-btn" onclick="saveAddress();">Save Address 保存地址</button>
    <div class="country-select">
      <label for="country">Select country, new address will be generated automatically after checking the box</label><br>
      <span>选择国家，在勾选后将自动生成新地址</span>
      <select id="country" onchange="changeCountry(this.value)">
        ${getCountryOptions(country)}
      </select>
    </div>
    <iframe class="map" src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>
    <table class="saved-addresses" id="savedAddressesTable">
      <thead>
        <tr>
          <th>操作 Operation</th>
          <th>备注 Notes</th>
          <th>姓名 Name</th>
          <th>性别 Gender</th>
          <th>电话号码 Phone number</th>
          <th>地址 Address</th>
        </tr>
      </thead>
      <tbody>
        <!-- 动态生成的内容 -->
      </tbody>
    </table>
    </div>
  <div class="footer">
  Original version by chatgpt.org.uk, modified by Adonis142857 ｜ <a href="https://github.com/Adonis142857/Real-Address-Generator" target="_blank"><img src="https://pic.imgdb.cn/item/66e7ab36d9c307b7e9cefd24.png" alt="GitHub" style="width: 20px; height: 20px; vertical-align: middle; position: relative; top: -3px;"></a>
</div>


  <script>
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        const copied = document.getElementById('copied')
        copied.style.display = 'block'
        setTimeout(() => {
          copied.style.display = 'none'
        }, 2000)
      })
    }
    function changeCountry(country) {
      window.location.href = \`?country=\${country}\`
    }
    function saveAddress() {
      const note = prompt('请输入备注（可以留空）｜ Please enter a note (can be left blank)') || '';
      const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
      const newEntry = {
        note: note,
        name: '${name}',
        gender: '${gender}',
        phone: '${phone.replace(/[()\\s-]/g, '')}',
        address: '${address}'
      };
      savedAddresses.push(newEntry);
      localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
      renderSavedAddresses();
    }
    

    // 渲染保存的地址
    function renderSavedAddresses() {
      const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
      const tbody = document.getElementById('savedAddressesTable').getElementsByTagName('tbody')[0];
      tbody.innerHTML = '';
      savedAddresses.forEach((entry, index) => {
        const row = tbody.insertRow();
        const deleteCell = row.insertCell();
        const noteCell = row.insertCell();
        const nameCell = row.insertCell();
        const genderCell = row.insertCell();
        const phoneCell = row.insertCell();
        const addressCell = row.insertCell();

        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除 Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => {
          savedAddresses.splice(index, 1);
          localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
          renderSavedAddresses();
        };
        deleteCell.appendChild(deleteBtn);

        noteCell.textContent = entry.note;
        nameCell.textContent = entry.name;
        genderCell.textContent = entry.gender;
        phoneCell.textContent = entry.phone;
        addressCell.textContent = entry.address;
      });
    }

    // 页面加载时渲染已保存的地址
    window.onload = function() {
      renderSavedAddresses();
    };
  </script>
</body>
</html>
`



  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8' },
  })
}

function getRandomLocationInCountry(country) {
  // 只保留澳大利亚和新增的瑞士坐标
  const countryCoordinates = {
    "AU": [{ lat: -33.8688, lng: 151.2093 }, { lat: -37.8136, lng: 144.9631 }], 
    "CH": [{ lat: 47.3769, lng: 8.5417 }, { lat: 46.2044, lng: 6.1432 }] // 新增瑞士坐标 (苏黎世, 日内瓦)
  }
  const coordsArray = countryCoordinates[country]
  const randomCity = coordsArray[Math.floor(Math.random() * coordsArray.length)]
  const lat = randomCity.lat + (Math.random() - 0.5) * 0.1
  const lng = randomCity.lng + (Math.random() - 0.5) * 0.1
  return { lat, lng }
}

function formatAddress(address, country) {
  return `${address.house_number} ${address.road}, ${address.city || address.town || address.village}, ${address.postcode || ''}, ${country}`;
}


function getRandomPhoneNumber(country) {
  // 只保留澳大利亚和新增的瑞士电话格式
  const phoneFormats = {
    "AU": () => {
      const areaCode = Math.floor(2 + Math.random() * 8).toString()
      const number = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')
      return `+61 ${areaCode} ${number}`
    },
    "CH": () => { // 新增瑞士电话格式
      const prefix = ['75', '76', '77', '78', '79'][Math.floor(Math.random() * 5)];
      const number1 = Math.floor(100 + Math.random() * 900).toString();
      const number2 = Math.floor(10 + Math.random() * 90).toString();
      const number3 = Math.floor(10 + Math.random() * 90).toString();
      return `+41 ${prefix} ${number1} ${number2} ${number3}`;
    }
  }
  return phoneFormats[country]()
}

function getRandomCountry() {
  // 只保留澳大利亚和瑞士
  const countries = ["AU", "CH"]
  return countries[Math.floor(Math.random() * countries.length)]
}

function getCountryOptions(selectedCountry) {
  // 只保留澳大利亚和瑞士的选项
  const countries = [
    { name: "Australia 澳大利亚", code: "AU" },
    { name: "Switzerland 瑞士", code: "CH" }
  ]
  return countries.map(({ name, code }) => `<option value="${code}" ${code === selectedCountry ? 'selected' : ''}>${name}</option>`).join('')
}
