// frontend/js/team.js
(async function(){
  const dataUrl = '../data/team.json';
  async function fetchJSON(url){
    try{
      const r = await fetch(url);
      if(!r.ok) throw new Error('Fetch failed ' + url);
      return await r.json();
    }catch(e){
      console.warn('team load error', e);
      return [];
    }
  }

  function makeCard(member){
    const wrap = document.createElement('article');
    wrap.className = 'team-card';
    wrap.innerHTML = `
      <div class="team-photo"><img src="../assets/images/team/${member.photo}" alt="${member.name}"/></div>
      <h3 class="team-name">${member.name}</h3>
      <div class="team-role">${member.role}</div>
      <p class="team-bio">${member.bio}</p>
    `;
    return wrap;
  }

  const teamGrid = document.querySelector('#teamGrid') || document.querySelector('.team-grid');
  if(!teamGrid) return;
  const members = await fetchJSON(dataUrl);
  if(!members || !members.length){
    teamGrid.innerHTML = '<p>No team data available.</p>';
    return;
  }
  teamGrid.innerHTML = '';
  members.forEach(m => teamGrid.appendChild(makeCard(m)));
})();
