import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ensureSession, loadAll, saveProfile as supaSaveProfile, saveDailyLog, saveSettings as supaSaveSettings } from "./supabase";

const SOURCES = [
  { org:"Mayo Clinic", desc:"Torn Meniscus — Diagnosis & Treatment", url:"https://www.mayoclinic.org/diseases-conditions/torn-meniscus/diagnosis-treatment/drc-20354823" },
  { org:"AAOS (2024)", desc:"Clinical Guideline — Acute Meniscal Pathology", url:"https://www.aaos.org/aaos-home/newsroom/press-releases/guideline-management-acute-isolated-meniscal-pathology/" },
  { org:"AAOS OrthoInfo", desc:"Meniscus Tears", url:"https://orthoinfo.aaos.org/en/diseases--conditions/meniscus-tears/" },
  { org:"HSS", desc:"Meniscal Repair Rehab Protocol", url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC3535118/" },
  { org:"Mass General", desc:"Arthroscopic Meniscal Repair Protocol", url:"https://www.massgeneral.org/assets/mgh/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-meniscus-repair.pdf" },
  { org:"Kaiser Permanente", desc:"Meniscus Rehab Exercises", url:"https://healthy.kaiserpermanente.org/health-wellness/health-encyclopedia/he.meniscus-tear-rehabilitation-exercises.uh2071" },
  { org:"NIH / PMC", desc:"Ankle Injury Rehabilitation", url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC164373/" },
  { org:"BMJ", desc:"Arthroscopy for Degenerative Knee", url:"https://www.bmj.com/content/357/bmj.j1982" },
  { org:"ACSM", desc:"American College of Sports Medicine — Exercise Guidelines", url:"https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines" },
];

const MUSCLES_DATA = {
  front: [
    { id:"deltoids-f",en:"Deltoids",zh:"三角肌",color:"#E8834A",paths:["M 32 22 Q 28 20 25 23 Q 24 28 27 30 L 33 27 Z","M 68 22 Q 72 20 75 23 Q 76 28 73 30 L 67 27 Z"],desc_en:"Shoulder muscles for upper body balance.",desc_zh:"肩部肌肉，维持上身平衡。",exercises:["Shoulder Press","Lateral Raises"],tips_en:"Can train upper body safely during knee rehab.",tips_zh:"膝关节康复期间可安全训练上肢。"},
    { id:"pecs",en:"Pectorals",zh:"胸肌",color:"#D46A5E",paths:["M 38 25 Q 42 23 50 24 Q 50 28 48 31 Q 44 32 38 30 Z","M 62 25 Q 58 23 50 24 Q 50 28 52 31 Q 56 32 62 30 Z"],desc_en:"Chest muscles. Safe during lower body recovery.",desc_zh:"胸部肌肉。下肢恢复期可安全训练。",exercises:["Modified Push-ups","Chest Press"],tips_en:"Use seated/lying positions to avoid knee stress.",tips_zh:"使用坐姿/仰卧以避免膝关节压力。"},
    { id:"biceps",en:"Biceps",zh:"肱二头肌",color:"#C97B4B",paths:["M 25 30 Q 23 32 22 38 Q 23 40 25 39 L 27 32 Z","M 75 30 Q 77 32 78 38 Q 77 40 75 39 L 73 32 Z"],desc_en:"Upper arm muscles.",desc_zh:"上臂肌肉。",exercises:["Bicep Curls","Hammer Curls"],tips_en:"Great for maintaining morale during knee rehab.",tips_zh:"膝关节康复期间保持积极性。"},
    { id:"abs",en:"Abdominals",zh:"腹肌",color:"#CF5C5C",paths:["M 43 31 Q 42 34 42 42 Q 44 46 50 47 Q 56 46 58 42 Q 58 34 57 31 Q 54 29 50 29 Q 46 29 43 31 Z"],desc_en:"Core stabilizers. Essential foundation for injury prevention.",desc_zh:"核心稳定肌。伤害预防的基础。",exercises:["Dead Bugs","Bird Dogs","Modified Planks"],tips_en:"Strong core compensates for knee/ankle weakness. Per HSS protocol.",tips_zh:"按HSS方案，强核心弥补膝踝弱点。"},
    { id:"obliques",en:"Obliques",zh:"腹斜肌",color:"#B5674D",paths:["M 38 30 L 42 31 Q 41 38 41 44 L 38 42 Q 36 36 38 30 Z","M 62 30 L 58 31 Q 59 38 59 44 L 62 42 Q 64 36 62 30 Z"],desc_en:"Side core for rotational stability.",desc_zh:"侧核心，旋转稳定性。",exercises:["Side Planks (modified)"],tips_en:"Rotate from core, not knee.",tips_zh:"从核心旋转，而非膝关节。"},
    { id:"quads",en:"Quadriceps",zh:"股四头肌",color:"#E05D5D",paths:["M 39 54 Q 37 60 36 68 Q 36 72 38 76 L 42 76 Q 46 72 47 68 Q 48 60 47 54 Z","M 61 54 Q 63 60 64 68 Q 64 72 62 76 L 58 76 Q 54 72 53 68 Q 52 60 53 54 Z"],desc_en:"CRITICAL for knee stability. Primary focus in meniscus rehab per AAOS guidelines.",desc_zh:"对膝关节稳定性至关重要。按AAOS指南，半月板康复的主要重点。",exercises:["Quad Sets","Straight Leg Raises","Wall Mini Squats"],tips_en:"Activate without deep bending. Quad sets are safest per HSS.",tips_zh:"无需深蹲即可激活。按HSS方案，股四头肌收缩最安全。"},
    { id:"adductors",en:"Adductors",zh:"内收肌",color:"#A85454",paths:["M 47 54 Q 48 62 48 70 L 50 72 L 52 70 Q 52 62 53 54 Z"],desc_en:"Inner thigh. Stabilizes knee during movement.",desc_zh:"大腿内侧。运动中稳定膝关节。",exercises:["Ball Squeeze","Side-Lying Adduction"],tips_en:"Ball squeezes between knees are safe early exercises.",tips_zh:"膝间夹球是安全的早期练习。"},
    { id:"tibialis",en:"Tibialis Anterior",zh:"胫骨前肌",color:"#D48A4C",paths:["M 39 80 Q 38 86 38 92 Q 38 95 39 97 L 42 97 Q 43 94 43 90 Q 43 84 42 78 Z","M 61 80 Q 62 86 62 92 Q 62 95 61 97 L 58 97 Q 57 94 57 90 Q 57 84 58 78 Z"],desc_en:"Shin muscle. Key for ankle effusion rehab per NIH.",desc_zh:"胫前肌。按NIH，脚踝积液康复关键。",exercises:["Ankle Pumps","Band Dorsiflexion"],tips_en:"Ankle pumps reduce effusion gently.",tips_zh:"踝泵温和减少积液。"},
  ],
  back: [
    { id:"traps",en:"Trapezius",zh:"斜方肌",color:"#C0785A",paths:["M 40 18 Q 44 16 50 15 Q 56 16 60 18 L 58 24 Q 54 22 50 21 Q 46 22 42 24 Z"],desc_en:"Upper back connecting neck and shoulders.",desc_zh:"上背部，连接颈肩。",exercises:["Shrugs","Face Pulls"],tips_en:"Trainable during lower body rehab.",tips_zh:"下肢康复期可训练。"},
    { id:"lats",en:"Latissimus Dorsi",zh:"背阔肌",color:"#B8654E",paths:["M 36 28 Q 38 32 40 38 Q 42 42 44 44 L 50 42 L 56 44 Q 58 42 60 38 Q 62 32 64 28 L 58 24 Q 54 22 50 21 Q 46 22 42 24 Z"],desc_en:"Large back muscles for posture.",desc_zh:"大背肌，维持姿势。",exercises:["Seated Rows","Lat Pulldown"],tips_en:"Seated rows maintain upper body during rehab.",tips_zh:"坐姿划船保持上肢力量。"},
    { id:"glutes",en:"Glutes",zh:"臀肌",color:"#E06848",paths:["M 38 48 Q 36 52 38 56 Q 42 58 50 57 Q 58 58 62 56 Q 64 52 62 48 Q 58 46 50 46 Q 42 46 38 48 Z"],desc_en:"ESSENTIAL for hip stability and knee alignment. Your #1 ally per AAOS.",desc_zh:"对髋关节稳定和膝关节排列至关重要。按AAOS，第一盟友。",exercises:["Glute Bridges","Clamshells","Wall Squats"],tips_en:"Bridges and clamshells are safe per AAOS guidelines.",tips_zh:"按AAOS指南，臀桥和蚌式开合安全。"},
    { id:"hamstrings",en:"Hamstrings",zh:"腘绳肌",color:"#CC5640",paths:["M 38 57 Q 37 63 36 70 Q 36 76 38 78 L 43 78 Q 46 74 47 70 Q 48 63 47 57 Z","M 62 57 Q 63 63 64 70 Q 64 76 62 78 L 57 78 Q 54 74 53 70 Q 52 63 53 57 Z"],desc_en:"Work with quads to stabilize knee. Critical for balanced recovery.",desc_zh:"与股四头肌协同稳定膝关节。平衡恢复关键。",exercises:["Hamstring Curls","Glute Bridges","Nordic Curls (advanced)"],tips_en:"Strengthen gradually per HSS. Avoid deep flexion early.",tips_zh:"按HSS逐步增强。早期避免深度屈曲。"},
    { id:"calves",en:"Calves",zh:"小腿肌肉",color:"#D4844C",paths:["M 38 80 Q 37 84 36 90 Q 36 96 38 98 L 43 98 Q 44 94 44 90 Q 44 84 43 80 Z","M 62 80 Q 63 84 64 90 Q 64 96 62 98 L 57 98 Q 56 94 56 90 Q 56 84 57 80 Z"],desc_en:"CRITICAL for ankle stability and effusion management.",desc_zh:"对脚踝稳定和积液管理至关重要。",exercises:["Double Calf Raises","Single-Leg Calf Raises"],tips_en:"Start double-leg per NIH. Single-leg only when swelling controlled.",tips_zh:"按NIH双腿开始。肿胀控制后单腿。"},
  ]
};

const EXERCISES = [
  // ─── Lower Body: Knee Rehab ───
  { id:"quad-set",name:"Quad Sets",zh:"股四头肌收缩",target:"Quadriceps",phase:1,intensity:1,safeFor:["knee","ankle"],sets:3,reps:12,hold:6,str:"beginner",gym:false,ytId:"hfHhVDW0aVE",ytStart:45,steps:["Sit/lie with affected leg straight","Place rolled towel under knee","Press knee into towel, tighten thigh","Hold 6s, relax","Repeat"],tip:"Imagine pushing kneecap to ceiling.",warn:"Stop if sharp knee pain.",src:"Kaiser / HSS" },
  { id:"slr",name:"Straight Leg Raises",zh:"直腿抬高",target:"Quads",phase:1,intensity:1,safeFor:["knee","ankle"],sets:3,reps:10,hold:3,str:"beginner",gym:false,ytId:"ucUGxOHdDvQ",ytStart:60,steps:["Lie down, unaffected knee bent","Affected leg straight","Tighten quad, lift 12\"","Hold 3s","Lower slowly"],tip:"Lock knee before lifting.",warn:"Smooth motion only.",src:"AAOS / Mass General" },
  { id:"heel-slide",name:"Heel Slides",zh:"足跟滑动",target:"Knee ROM",phase:1,intensity:1,safeFor:["knee"],sets:3,reps:10,hold:2,str:"beginner",gym:false,ytId:"Rr0g_b8Neq4",ytStart:90,steps:["Lie with legs straight","Slide heel toward buttock","As far as comfortable","Hold 2s","Slide back"],tip:"Towel under heel.",warn:"Never push into pain.",src:"HSS Protocol" },
  { id:"clamshell",name:"Clamshells",zh:"蚌式开合",target:"Hip abductors",phase:1,intensity:1,safeFor:["knee","ankle"],sets:3,reps:15,hold:2,str:"beginner",gym:false,ytId:"hfHhVDW0aVE",ytStart:0,steps:["Side-lying, knees bent 45°","Feet together","Lift top knee","Hold 2s","Lower slowly"],tip:"Strengthens hip stabilizers.",warn:"Don't roll pelvis.",src:"AAOS" },
  { id:"wall-squat",name:"Wall Mini Squats",zh:"靠墙半蹲",target:"Quads & glutes",phase:2,intensity:2,safeFor:["knee","ankle"],sets:3,reps:10,hold:10,str:"beginner",gym:false,ytId:"lCojvuCzqyY",ytStart:120,steps:["Back against wall","Feet 1ft out","Slide to 30° max","Hold 10s","Push up"],tip:"30° = safe for meniscus.",warn:"Max 45°.",src:"Kaiser / Mayo" },
  { id:"step-up",name:"Low Step-Ups",zh:"低台阶上下",target:"Functional",phase:2,intensity:2,safeFor:["knee"],sets:3,reps:10,hold:0,str:"beginner",gym:false,ytId:"H2YsK0egZBU",ytStart:0,steps:["4-6\" step","Affected leg first","Push through heel","Step down other leg","Knee over toes"],tip:"Quality > height.",warn:"Use railing.",src:"Mass General" },
  { id:"bridge",name:"Glute Bridges",zh:"臀桥",target:"Glutes & core",phase:2,intensity:2,safeFor:["knee","ankle"],sets:3,reps:12,hold:3,str:"beginner",gym:false,ytId:"Rr0g_b8Neq4",ytStart:0,steps:["Lie back, knees bent","Push hips up","Squeeze glutes","Hold 3s","Lower"],tip:"No knee stress.",warn:"Don't hyperextend.",src:"AAOS / HSS" },
  { id:"leg-press-light",name:"Leg Press (Light)",zh:"腿举（轻重量）",target:"Quads & glutes",phase:2,intensity:2,safeFor:["knee"],sets:3,reps:10,hold:0,str:"beginner",gym:true,ytId:"lCojvuCzqyY",ytStart:0,steps:["Sit in leg press machine","Feet shoulder-width, mid-platform","Press out to ~30° bend only","Slowly return","Light weight, high control"],tip:"Machine supports your back — great for beginners.",warn:"Never lock knees. Don't go past 45° bend.",src:"ACSM / AAOS" },
  { id:"leg-ext-machine",name:"Leg Extensions (Machine)",zh:"腿屈伸器械",target:"Quadriceps isolation",phase:2,intensity:2,safeFor:["knee"],sets:3,reps:12,hold:2,str:"beginner",gym:true,ytId:"lCojvuCzqyY",ytStart:60,steps:["Sit in machine, adjust pad to shins","Extend legs to straight","Hold 2s at top","Lower slowly","Light weight only"],tip:"Isolates quads without balance challenge.",warn:"Stop if any knee clicking.",src:"AAOS / Kaiser" },
  { id:"sl-balance",name:"Single-Leg Balance",zh:"单腿平衡",target:"Proprioception",phase:3,intensity:3,safeFor:["knee","ankle"],sets:4,reps:1,hold:30,str:"beginner",gym:false,ytId:"Rr0g_b8Neq4",ytStart:300,steps:["Near wall","Lift unaffected foot","Balance 30s","Slight knee bend","Progress: eyes closed"],tip:"Rewires proprioception.",warn:"Have support.",src:"HSS / NIH" },
  { id:"partial-lunge",name:"Partial Lunges",zh:"半弓步",target:"Functional",phase:3,intensity:3,safeFor:["knee"],sets:3,reps:8,hold:0,str:"intermediate",gym:false,ytId:"lCojvuCzqyY",ytStart:240,steps:["Hip-width","Short step forward","Partial bend ~45°","Push front heel","Knee over ankle"],tip:"Control > depth.",warn:"No twisting.",src:"Kaiser / AAOS" },
  { id:"ham-curl",name:"Hamstring Curls",zh:"站姿腿弯举",target:"Hamstrings",phase:3,intensity:3,safeFor:["knee","ankle"],sets:3,reps:12,hold:2,str:"beginner",gym:false,ytId:"ucUGxOHdDvQ",ytStart:180,steps:["Hold counter","Heel to buttock","Comfortable range","Hold 2s","Lower"],tip:"Add ankle weight when easy.",warn:"Pain-free range.",src:"AAOS / Mass General" },
  { id:"ham-curl-machine",name:"Hamstring Curl Machine",zh:"腿弯举器械",target:"Hamstrings",phase:3,intensity:3,safeFor:["knee"],sets:3,reps:10,hold:2,str:"beginner",gym:true,ytId:"ucUGxOHdDvQ",ytStart:0,steps:["Lie face down on machine","Adjust pad to ankles","Curl heels toward buttock","Hold 2s at top","Lower slowly, light weight"],tip:"Machine provides stability.",warn:"Stop if any knee pain.",src:"ACSM" },
  // ─── Lower Body: Ankle Rehab ───
  { id:"ankle-pump",name:"Ankle Pumps",zh:"踝泵运动",target:"Ankle mobility",phase:1,intensity:1,safeFor:["ankle"],sets:3,reps:20,hold:0,str:"beginner",gym:false,ytId:"AGnPPbSEs7U",ytStart:30,steps:["Elevate leg on pillow","Point toes down","Pull toes up","Full comfortable range","Add circles when easy"],tip:"Pumps fluid out of joint.",warn:"Pain-free range.",src:"NIH PMC" },
  { id:"calf-raise",name:"Double Calf Raises",zh:"双腿提踵",target:"Calves",phase:2,intensity:2,safeFor:["ankle","knee"],sets:3,reps:15,hold:2,str:"beginner",gym:false,ytId:"o590MavfNF8",ytStart:180,steps:["Stand, hands on counter","Rise onto toes","Hold 2s","Lower with control","No bouncing"],tip:"Shift weight to affected side gradually.",warn:"Stop if swelling increases.",src:"NIH PMC" },
  { id:"band-ankle",name:"Band Ankle 4-Way",zh:"弹力带踝关节四向",target:"Ankle strength",phase:2,intensity:2,safeFor:["ankle"],sets:2,reps:10,hold:2,str:"beginner",gym:false,ytId:"AGnPPbSEs7U",ytStart:120,steps:["Band around foot","Push DOWN","Pull UP","Turn IN","Turn OUT"],tip:"All 4 directions matter.",warn:"Light band first.",src:"NIH PMC" },
  { id:"sl-calf",name:"Single-Leg Calf Raises",zh:"单腿提踵",target:"Advanced calf",phase:3,intensity:3,safeFor:["ankle"],sets:3,reps:10,hold:2,str:"intermediate",gym:false,ytId:"o590MavfNF8",ytStart:300,steps:["Stand on affected leg","Hold counter","Rise onto toes","Hold 2s","Lower"],tip:"Only when double-leg easy.",warn:"Drop back if swelling.",src:"NIH PMC" },
  { id:"seated-calf-machine",name:"Seated Calf Raises (Machine)",zh:"坐姿提踵器械",target:"Soleus & calves",phase:2,intensity:2,safeFor:["ankle"],sets:3,reps:15,hold:2,str:"beginner",gym:true,ytId:"o590MavfNF8",ytStart:0,steps:["Sit in seated calf machine","Place balls of feet on platform","Press up through toes","Hold 2s at top","Lower slowly, light weight"],tip:"Seated = gentler on ankle. Great for soleus.",warn:"Start with minimal weight.",src:"ACSM" },
  // ─── Upper Body ───
  { id:"wall-pushup",name:"Wall Push-Ups",zh:"靠墙俯卧撑",target:"Chest & triceps",phase:1,intensity:1,safeFor:["upper"],sets:3,reps:10,hold:0,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:0,steps:["Stand arm-length from wall","Hands shoulder-width on wall","Bend elbows, lean in slowly","Push back to start","Keep core tight"],tip:"Perfect for beginners — adjust difficulty by stepping further.",warn:"Keep wrists straight.",src:"ACSM" },
  { id:"seated-row-band",name:"Seated Band Rows",zh:"坐姿弹力带划船",target:"Upper back & posture",phase:1,intensity:1,safeFor:["upper"],sets:3,reps:12,hold:2,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:60,steps:["Sit with legs extended, band around feet","Hold band ends, arms extended","Pull elbows back, squeeze shoulder blades","Hold 2s","Slowly release"],tip:"Essential for posture.",warn:"Don't round your back.",src:"ACSM" },
  { id:"bicep-curl",name:"Light Bicep Curls",zh:"轻重量二头弯举",target:"Biceps",phase:1,intensity:1,safeFor:["upper"],sets:3,reps:12,hold:1,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:120,steps:["Sit or stand, light weight in each hand","Palms facing forward","Curl toward shoulders slowly","Hold 1s at top","Lower with control"],tip:"Start with 1-2 kg or water bottles.",warn:"Don't swing.",src:"ACSM" },
  { id:"band-pull-apart",name:"Band Pull-Aparts",zh:"弹力带面拉",target:"Rear delts & posture",phase:1,intensity:1,safeFor:["upper"],sets:3,reps:15,hold:1,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:120,steps:["Hold light band at chest height","Arms straight in front","Pull band apart, squeeze shoulder blades","Hold 1s","Return slowly"],tip:"Best beginner exercise for posture.",warn:"Use a very light band.",src:"ACSM" },
  { id:"lat-raise-light",name:"Light Lateral Raises",zh:"轻重量侧平举",target:"Shoulders",phase:1,intensity:1,safeFor:["upper"],sets:3,reps:10,hold:1,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:180,steps:["Sit or stand, light weights at sides","Raise arms to sides, elbows slightly bent","Lift to shoulder height only","Hold 1s","Lower slowly"],tip:"Start with 0.5-1 kg. Shoulders tire fast.",warn:"Don't lift above shoulders.",src:"ACSM" },
  { id:"overhead-press-light",name:"Seated Shoulder Press (Light)",zh:"坐姿轻重量肩推",target:"Shoulders & triceps",phase:2,intensity:2,safeFor:["upper"],sets:3,reps:8,hold:1,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:180,steps:["Sit with back support","Light weights at shoulder height","Press overhead slowly","Hold 1s at top","Lower to shoulders"],tip:"Seated + back support = safe and stable.",warn:"Don't arch back.",src:"ACSM" },
  { id:"tricep-ext-light",name:"Light Tricep Extensions",zh:"轻重量三头臂屈伸",target:"Triceps",phase:2,intensity:2,safeFor:["upper"],sets:3,reps:10,hold:1,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:240,steps:["Sit, hold one light dumbbell with both hands","Raise overhead","Lower behind head by bending elbows","Extend back up slowly","Keep elbows close to ears"],tip:"Two hands on one weight = easier for beginners.",warn:"Start with 1-2 kg.",src:"ACSM" },
  { id:"lat-pulldown-machine",name:"Lat Pulldown (Machine)",zh:"高位下拉器械",target:"Lats & back",phase:2,intensity:2,safeFor:["upper"],sets:3,reps:10,hold:2,str:"beginner",gym:true,ytId:"a6YHbXD2XlU",ytStart:300,steps:["Sit at lat pulldown machine","Grab bar wider than shoulders","Pull bar to upper chest","Squeeze shoulder blades, hold 2s","Release slowly"],tip:"Machine guides the motion — perfect for beginners.",warn:"Don't lean back too far. Lightest weight.",src:"ACSM" },
  { id:"chest-press-machine",name:"Chest Press (Machine)",zh:"坐姿推胸器械",target:"Chest & triceps",phase:2,intensity:2,safeFor:["upper"],sets:3,reps:10,hold:1,str:"beginner",gym:true,ytId:"a6YHbXD2XlU",ytStart:0,steps:["Sit in chest press machine","Handles at chest height","Press forward, arms nearly straight","Hold 1s","Return slowly"],tip:"Much easier than push-ups. Machine supports form.",warn:"Don't lock elbows. Minimal weight.",src:"ACSM" },
  { id:"row-machine",name:"Seated Row Machine",zh:"坐姿划船器械",target:"Upper back",phase:2,intensity:2,safeFor:["upper"],sets:3,reps:10,hold:2,str:"beginner",gym:true,ytId:"a6YHbXD2XlU",ytStart:60,steps:["Sit at cable row, feet on platform","Grab handles, arms extended","Pull toward torso, squeeze back","Hold 2s","Release slowly"],tip:"Great for posture. Machine removes balance challenge.",warn:"Sit tall, don't round forward.",src:"ACSM" },
  { id:"plank-mod",name:"Modified Plank (Knees)",zh:"跪姿平板支撑",target:"Core & shoulders",phase:2,intensity:2,safeFor:["upper","knee","ankle"],sets:3,reps:1,hold:15,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:60,steps:["Forearms on floor, knees on mat","Lift hips to straight line","Engage core, don't sag","Hold 15s (build up)","Rest and repeat"],tip:"Start with 10s if needed.",warn:"Stop if lower back hurts. Cushion under knees.",src:"ACSM / AAOS" },
  // ─── Kaiser PT Program ───
  { id:"bridge-pelvic",name:"Bridge with Pelvic Floor",zh:"骨盆底收缩臀桥",target:"Glutes & pelvic floor",phase:1,intensity:1,safeFor:["knee","ankle"],sets:2,reps:10,hold:2,str:"beginner",gym:false,ytId:"Rr0g_b8Neq4",ytStart:0,steps:["Lie on back, knees bent, feet flat","Contract pelvic floor muscles first","Tighten buttocks and lift hips to bridge","Hold 2s at top","Lower slowly, maintain breathing"],tip:"Breathe evenly throughout — don't hold your breath. Keep pelvic floor active the entire time.",warn:"Don't hyperextend your back at the top.",src:"Kaiser PT Program" },
  { id:"bridge-walkout",name:"Bridge Walk Out",zh:"臀桥行走",target:"Glutes, core & hamstrings",phase:2,intensity:2,safeFor:["knee","ankle"],sets:2,reps:10,hold:2,str:"beginner",gym:false,ytId:"Rr0g_b8Neq4",ytStart:0,steps:["Lie on back, knees bent, feet flat","Lift hips into bridge position","Slowly walk heels away from body one at a time","Walk out until knees nearly straight","Walk heels back in and repeat"],tip:"Keep abs tight and don't let hips drop to either side as you move your legs.",warn:"Lower hips if you feel lower back strain.",src:"Kaiser PT Program" },
  { id:"seated-knee-ext-band",name:"Seated Knee Extension (Band)",zh:"坐姿弹力带腿屈伸",target:"Quadriceps (right leg focus)",phase:1,intensity:1,safeFor:["knee"],sets:3,reps:10,hold:0,str:"beginner",gym:false,ytId:"lCojvuCzqyY",ytStart:60,steps:["Sit upright in chair, band around foot and chair leg","Slowly straighten knee against band resistance","Pause briefly at full extension","Lower slowly with control","Focus mostly on right leg per PT instructions"],tip:"Can anchor band around opposite ankle if easier. Goal is to target the quad.",warn:"Stop if this makes knee symptoms worse. Mostly perform on right side.",src:"Kaiser PT Program" },
  { id:"sidelying-hip-circles",name:"Sidelying Hip Circles",zh:"侧卧髋部画圈",target:"Glute med (hip abductor)",phase:2,intensity:2,safeFor:["knee","ankle"],sets:2,reps:10,hold:0,str:"beginner",gym:false,ytId:"hfHhVDW0aVE",ytStart:0,steps:["Lie on your side","Lift top leg slightly","Trace small circles clockwise","Then trace counterclockwise","Focus the work in your back/side glute"],tip:"Variation: move leg as if drawing the letter 'M' to engage low back muscles near spine.",warn:"Don't let hips roll forward or backward.",src:"Kaiser PT Program" },
  { id:"eccentric-leg-press",name:"Eccentric Single Leg Press",zh:"离心单腿腿举",target:"Quads & glutes (eccentric focus)",phase:3,intensity:3,safeFor:["knee"],sets:3,reps:10,hold:0,str:"beginner",gym:true,ytId:"lCojvuCzqyY",ytStart:0,steps:["Warm up pressing with both legs","Press platform away with both legs","Remove one leg from platform","Lower weight slowly with right leg only over 5 seconds","Place both feet back, press up, repeat"],tip:"The slow lowering (eccentric) is the key part. 2 sets focusing on right leg.",warn:"Keep movements slow and controlled. Don't let knees collapse inward.",src:"Kaiser PT Program" },
  { id:"sidelying-ball-lift",name:"Sidelying Leg Lift with Ball",zh:"侧卧夹球抬腿",target:"Adductors & hip abductors",phase:2,intensity:2,safeFor:["knee","ankle"],sets:2,reps:10,hold:0,str:"beginner",gym:false,ytId:"hfHhVDW0aVE",ytStart:0,steps:["Lie on side with ball between ankles","Top arm resting on ground for support","Squeeze ball and raise both legs together","Hold briefly at top","Lower slowly. Perform on both sides"],tip:"Slow up and down — control is more important than height.",warn:"Keep hips facing straight forward. Don't roll.",src:"Kaiser PT Program" },
  { id:"adductor-wall-stretch",name:"Supine Adductor Stretch at Wall",zh:"仰卧靠墙内收肌拉伸",target:"Inner thigh flexibility",phase:1,intensity:1,safeFor:["knee","ankle"],sets:1,reps:2,hold:45,str:"beginner",gym:false,ytId:"Rr0g_b8Neq4",ytStart:90,steps:["Lie on back with legs resting up against wall","Slowly lower legs out to the sides","Let gravity provide the stretch","Hold 30-60 seconds","Can perform on just one side if preferred"],tip:"Keep knees straight to improve the stretch. Very gentle — let gravity do the work.",warn:"Don't force the stretch. Breathe and relax into it.",src:"Kaiser PT Program" },
  { id:"dead-bug-leg-ext",name:"Dead Bug with Leg Extension",zh:"死虫式伸腿",target:"Core stabilizers",phase:2,intensity:2,safeFor:["knee","ankle","upper"],sets:3,reps:16,hold:0,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:60,steps:["Lie on back, lift legs to 90° and arms toward ceiling","Lower one arm overhead while straightening opposite leg","Keep back flat against floor","Return to start position","Alternate sides — 8 reps each side"],tip:"This is your #1 core exercise. Keep abs tight and back pressed to floor the entire time.",warn:"If back arches off floor, don't extend leg as far.",src:"Kaiser PT Program" },
  { id:"ham-curl-band",name:"Standing Hamstring Curl (Band)",zh:"站姿弹力带腿弯举",target:"Hamstrings",phase:2,intensity:2,safeFor:["knee","ankle"],sets:2,reps:10,hold:0,str:"beginner",gym:false,ytId:"ucUGxOHdDvQ",ytStart:180,steps:["Stand holding chair, band under one foot and around other ankle","Bend knee, pulling foot upward against resistance","Slowly lower back down","Keep back straight throughout","Can substitute with ankle weight instead of band"],tip:"A weight may be more convenient than a band if available.",warn:"Keep back straight. Maintain balance.",src:"Kaiser PT Program" },
  { id:"band-side-step",name:"Side Stepping with Band",zh:"弹力带侧向行走",target:"Glute med & hip stabilizers",phase:2,intensity:2,safeFor:["knee","ankle"],sets:2,reps:15,hold:0,str:"beginner",gym:false,ytId:"hfHhVDW0aVE",ytStart:0,steps:["Stand with band around ankles","Bend knees into mini squat","Step sideways maintaining band tension","Keep feet pointing forward","Perform until muscles are tired"],tip:"This is excellent for knee tracking. The burn in the side of your glutes is the goal.",warn:"Don't let knees collapse inward. Stay in mini squat.",src:"Kaiser PT Program" },
  { id:"upright-bike",name:"Upright Bike Intervals",zh:"立式单车间歇训练",target:"Cardio & leg endurance",phase:2,intensity:2,safeFor:["knee","ankle"],sets:2,reps:10,hold:0,str:"beginner",gym:true,ytId:"o590MavfNF8",ytStart:0,steps:["Adjust seat — slight knee bend at lowest pedal point","5 minute warm-up at easy pace","Intervals: 20s on (60-90% effort) / 10s off","Repeat 10 intervals per set","5 minute cool-down"],tip:"Great low-impact cardio. Adjust resistance to challenge level.",warn:"Stop if knee pain increases. Keep movements fluid.",src:"Kaiser PT Program" },
  { id:"lateral-shuffle",name:"Lateral Shuffles",zh:"侧向滑步",target:"Agility & lateral stability",phase:3,intensity:3,safeFor:["knee","ankle"],sets:2,reps:10,hold:0,str:"intermediate",gym:false,ytId:"lCojvuCzqyY",ytStart:240,steps:["Stand in open flat space","Bend knees into mini squat","Skip sideways quickly","Keep core engaged","Start with stepping, then add a little hop"],tip:"Progress from stepping to hopping as confidence builds.",warn:"Keep core engaged, don't arch low back.",src:"Kaiser PT Program" },
  { id:"braided-sidestep",name:"Braided Sidestepping",zh:"交叉侧步",target:"Coordination & lateral movement",phase:3,intensity:3,safeFor:["knee","ankle"],sets:1,reps:10,hold:0,str:"intermediate",gym:false,ytId:"lCojvuCzqyY",ytStart:240,steps:["Stand on open flat surface","Walk sideways","Alternate stepping behind and in front of leading foot","Maintain balance throughout","Perform in both directions"],tip:"Start slow — this is a coordination challenge as much as strength.",warn:"Maintain balance. Use a wall nearby if needed.",src:"Kaiser PT Program" },
  { id:"forward-t",name:"Forward T Balance",zh:"前倾T字平衡",target:"Single-leg stability & posterior chain",phase:3,intensity:3,safeFor:["knee","ankle"],sets:1,reps:10,hold:2,str:"intermediate",gym:false,ytId:"Rr0g_b8Neq4",ytStart:300,steps:["Stand upright, hands at waist","Balance on one leg","Hinge at hips, tilt body forward","Extend other leg backward (T shape)","Return to standing. Both sides"],tip:"Can hold a counter for support if needed. Perform on each side.",warn:"Keep back straight. Don't let standing knee collapse inward.",src:"Kaiser PT Program" },
  { id:"deadlift-db",name:"Deadlift with Dumbbells",zh:"哑铃硬拉",target:"Posterior chain (glutes, hams, back)",phase:3,intensity:3,safeFor:["knee","ankle"],sets:2,reps:10,hold:0,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:0,steps:["Stand feet shoulder-width, dumbbell in each hand","Bend at hips and slightly at knees","Lower dumbbells toward ground, keep them close to legs","Stand back up by straightening hips and knees together","Maintain slight knee bend throughout"],tip:"PT used 10lb weights in clinic. Keep core tight and back straight.",warn:"Don't lock knees completely straight. Keep dumbbells close to legs.",src:"Kaiser PT Program" },
  { id:"sl-squat-chair",name:"Single Leg Squat to Chair",zh:"单腿深蹲触椅",target:"Quad & glute strength (unilateral)",phase:3,intensity:3,safeFor:["knee"],sets:2,reps:5,hold:0,str:"intermediate",gym:false,ytId:"lCojvuCzqyY",ytStart:120,steps:["Stand in front of chair","Lift one leg off ground","Lower into squat until you lightly touch chair","Stand back up on one leg","Higher chair = easier. Both sides"],tip:"Use non-working heel on ground for support if needed.",warn:"Don't let knee go past toes. Maintain balance.",src:"Kaiser PT Program" },
  { id:"adductor-ham-strap",name:"Hip Adductor & Hamstring Stretch",zh:"内收肌腘绳肌拉伸",target:"Inner thigh & hamstring flexibility",phase:1,intensity:1,safeFor:["knee","ankle"],sets:1,reps:2,hold:25,str:"beginner",gym:false,ytId:"Rr0g_b8Neq4",ytStart:90,steps:["Lie on back, strap around one foot","Pull leg up toward body using strap","Straighten leg, then let it lower out to side","Feel stretch in inner thigh","Hold 20-30s. Turn foot in/out for variation"],tip:"Keep low back flat against floor. Very gentle stretch.",warn:"Don't force it — let the strap do the work.",src:"Kaiser PT Program" },
  { id:"bird-dog-pelvic",name:"Bird Dog with Pelvic Floor",zh:"鸟狗式（含骨盆底）",target:"Core, back & pelvic floor",phase:2,intensity:2,safeFor:["knee","ankle","upper"],sets:2,reps:12,hold:0,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:60,steps:["Start on all fours","Exhale and contract pelvic floor","Lift one arm and opposite leg","Hold briefly, return to start","Alternate sides. 6 each side"],tip:"Variation: widen arm and leg to sides like a 'dash' for extra challenge. Both sides.",warn:"Keep back straight and pelvic floor contracted throughout.",src:"Kaiser PT Program" },
  { id:"wide-squat",name:"Wide Stance Squat",zh:"宽站距深蹲",target:"Quads, glutes & adductors",phase:2,intensity:2,safeFor:["knee","ankle"],sets:2,reps:10,hold:2,str:"beginner",gym:false,ytId:"lCojvuCzqyY",ytStart:120,steps:["Stand with feet wide, toes pointed outward","Squat by bending knees and hips","Keep weight in heels","Hold 1-10 seconds at bottom","Stand back up. Can hold weight for extra challenge"],tip:"This is a sumo squat — the wide stance works inner thighs more.",warn:"Keep back straight. Don't let knees collapse inward or go past toes.",src:"Kaiser PT Program" },
  { id:"baby-cobra",name:"Baby Cobra Hands Up",zh:"小眼镜蛇式",target:"Back extensors & posture",phase:1,intensity:1,safeFor:["upper","knee","ankle"],sets:1,reps:5,hold:15,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:0,steps:["Lie face down, toes pointed, legs straight","Place hands next to chest","Push hands into floor, lift upper chest gently","Belly stays on floor","Lift hands off floor, hover 1-2 inches. Hold 5-30s"],tip:"Keep elbows pointing in. Look slightly down to keep neck long.",warn:"Don't force the extension. Gentle lift only.",src:"Kaiser PT Program" },
  { id:"superman-table",name:"Superman on Table",zh:"超人式（床上）",target:"Back extensors & posterior chain",phase:2,intensity:2,safeFor:["upper","knee","ankle"],sets:1,reps:5,hold:15,str:"beginner",gym:false,ytId:"a6YHbXD2XlU",ytStart:0,steps:["Lie face down on bed, head slightly over edge","Arms at sides, chin tucked","Lift head until back is straight","Draw shoulder blades down and together","Raise arms a few inches off bed. Hold 5-30s"],tip:"Variations: arms overhead; alternate arm + opposite leg (swimming); superman-banana roll.",warn:"Keep chin tucked. Don't turn or rotate head.",src:"Kaiser PT Program" },
  // Clinician note: 6 min quad massage daily
  { id:"quad-massage",name:"Quad Self-Massage",zh:"股四头肌自我按摩",target:"Right leg: rectus femoris & vastus lateralis",phase:1,intensity:1,safeFor:["knee"],sets:1,reps:1,hold:360,str:"beginner",gym:false,ytId:"hfHhVDW0aVE",ytStart:0,steps:["Sit or lie comfortably","Massage front quad (rectus femoris) on RIGHT leg for 6 minutes","Then massage outside quad (vastus lateralis) for 6 minutes","Use hands, foam roller, or massage ball","Apply moderate pressure — should feel good, not painful"],tip:"Per your PT: do this daily. 12 minutes total. Helps release muscle tension around the knee.",warn:"Avoid pressing directly on the kneecap. Massage the muscle belly only.",src:"Kaiser PT — Clinician Notes" },
];

const DAYS=["S","M","T","W","T","F","S"];
const DAYSFULL=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MOODS=[{emoji:"😣",l:"Rough",v:1},{emoji:"😕",l:"Low",v:2},{emoji:"😐",l:"Okay",v:3},{emoji:"🙂",l:"Good",v:4},{emoji:"😊",l:"Great",v:5}];
const PAIN=[{l:"None",v:0,c:"#34C759"},{l:"Mild",v:1,c:"#A8D86B"},{l:"Moderate",v:2,c:"#FFD60A"},{l:"Noticeable",v:3,c:"#FF9F0A"},{l:"High",v:4,c:"#FF3B30"}];
const SWELL=[{l:"None",v:0,c:"#34C759"},{l:"Slight",v:1,c:"#FFD60A"},{l:"Moderate",v:2,c:"#FF9F0A"},{l:"Severe",v:3,c:"#FF3B30"}];

const dk=d=>d.toISOString().split("T")[0],tod=()=>dk(new Date());

// ─── Adaptive Progression Engine ───
function genWorkout(ci,hist,profile){
  const{pain,swelling,mood,areas}=ci;
  const{level="beginner",hasGym=false,age="30",weight="60"}=profile||{};
  const yd=new Date();yd.setDate(yd.getDate()-1);const didY=hist[dk(yd)];
  const ageNum=parseInt(age)||30;const weightNum=parseInt(weight)||60;

  // Count completed unique exercises in last 7 days
  const last7=[];for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);const k=dk(d);if(hist[k])last7.push(hist[k]);}
  const recentExIds=new Set();last7.forEach(d=>(d.completed||[]).forEach(id=>recentExIds.add(id)));
  const phase1Done=EXERCISES.filter(e=>e.phase===1&&recentExIds.has(e.id)).length;
  const phase1Total=EXERCISES.filter(e=>e.phase===1).length;
  const phase2Done=EXERCISES.filter(e=>e.phase===2&&recentExIds.has(e.id)).length;
  const phase2Total=EXERCISES.filter(e=>e.phase===2).length;
  const totalSessions=last7.length;

  // Adaptive phase suggestion
  let suggestedPhase=1,progression="";
  if(phase1Done>=phase1Total*0.7&&totalSessions>=3&&pain<=1&&swelling<=1){
    suggestedPhase=2;
    progression="📈 Progressing to Phase 2 — you've mastered most foundation exercises! 进阶到第二阶段！";
  }
  if(phase2Done>=phase2Total*0.6&&totalSessions>=5&&pain<=1&&swelling<=0){
    suggestedPhase=3;
    progression="🚀 Ready for Phase 3 — your strength is building well! 准备进入第三阶段！";
  }

  let mp=suggestedPhase,mi=suggestedPhase,cnt=5,note="";
  if(pain>=4||swelling>=3){mp=1;mi=1;cnt=3;note="Easy session — high discomfort. 温和训练，不适感较高。";progression="";}
  else if(pain>=3||swelling>=2){mp=1;mi=1;cnt=4;note="Light session — mobility focus. 轻度训练。";}
  else if(pain>=2){mp=Math.min(mp,2);mi=2;cnt=4;note="Moderate session — building carefully. 稳步增强。";}
  else if(mood<=2){mp=Math.min(mp,2);mi=2;cnt=3;note="Short session — conserving energy. 简短训练。";}
  else if(didY){mp=Math.min(mp,2);mi=2;cnt=3;note="Recovery day — light movement. 恢复日。";}
  else if(mood>=4&&pain<=1&&swelling<=1){cnt=areas.length>=3?7:5;note=progression||"Great condition — full session! 状态很好！";}
  else{cnt=areas.length>=3?6:5;note=progression||"Steady session — good fundamentals. 稳定训练。";}

  let pool=EXERCISES.filter(e=>
    e.phase<=mp&&e.intensity<=mi&&
    e.safeFor.some(s=>areas.includes(s))&&
    (level==="beginner"?e.str==="beginner":true)&&
    (e.gym?hasGym:true)
  );
  // Favor less-done exercises for variety
  const cc={};Object.values(hist).forEach(d=>(d.completed||[]).forEach(id=>{cc[id]=(cc[id]||0)+1}));
  pool.sort((a,b)=>(cc[a.id]||0)-(cc[b.id]||0));
  const untried=pool.filter(e=>!cc[e.id]);
  const sel=[];

  // ─── Guarantee at least 1-2 exercises from EACH selected area ───
  const minPerArea = cnt >= 6 ? 2 : 1;
  for (const area of areas) {
    const areaPool = pool.filter(e => e.safeFor.includes(area) && !sel.find(s => s.id === e.id));
    // Prefer untried from this area
    const areaUntried = areaPool.filter(e => !cc[e.id]);
    const picks = areaUntried.length > 0 ? areaUntried : areaPool;
    for (let i = 0; i < Math.min(minPerArea, picks.length); i++) {
      if (!sel.find(s => s.id === picks[i].id)) sel.push(picks[i]);
    }
  }

  // Fill remaining slots with variety from the full pool
  if(untried.length>0){
    const untriedNotSel=untried.filter(e=>!sel.find(s=>s.id===e.id));
    if(untriedNotSel.length>0&&sel.length<cnt) sel.push(untriedNotSel[0]);
  }
  for(const e of pool){if(sel.length>=cnt)break;if(!sel.find(s=>s.id===e.id))sel.push(e);}
  // Adjust sets/reps based on profile + condition
  const adj=sel.map(e=>{
    let s=e.sets,r=e.reps;
    // Condition adjustments
    if(pain>=3||swelling>=2){s=Math.max(2,s-1);r=Math.max(5,r-4);}
    else if(mood>=5&&pain===0){r+=2;}
    // Profile adjustments
    if(level==="beginner"){r=Math.max(5,r-2);s=Math.min(s,3);}
    if(ageNum>50){r=Math.max(5,r-2);s=Math.min(s,3);}
    if(ageNum>60){r=Math.max(4,r-3);s=Math.min(s,2);}
    // For gym exercises, mark them
    return{...e,sets:s,reps:r};
  });
  const est=adj.reduce((s,e)=>s+(e.sets*e.reps*Math.max(e.hold,2))/60+e.sets*0.5,0);
  return{exercises:adj,note,est:Math.round(est),mp,progression,suggestedPhase};
}

// ─── UI Helpers ───
const C={bg:"#FFFFFF",card:"#F5F5F7",text:"#1D1D1F",sub:"#86868B",accent:"#FF2D55",accent2:"#007AFF",green:"#34C759",orange:"#FF9F0A",border:"#E5E5EA",cardBorder:"#E8E8ED"};
const SF="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";
const MONO="'SF Mono', SFMono-Regular, Menlo, monospace";

// ─── Exercise Animations ───
// ─── Exercise Quick Preview (YouTube thumbnail) ───
function ExerciseAnim({id}) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return null;

  const thumbUrl = `https://img.youtube.com/vi/${ex.ytId}/mqdefault.jpg`;
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div style={{borderRadius:14,overflow:"hidden",marginBottom:14,border:`1px solid ${C.cardBorder}`}}>
        <div style={{position:"relative",paddingBottom:"56.25%",height:0}}>
          <iframe
            src={`https://www.youtube.com/embed/${ex.ytId}?start=${ex.ytStart||0}&autoplay=1&rel=0`}
            style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
            allow="autoplay;encrypted-media" allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setPlaying(true)} style={{
      borderRadius:14,overflow:"hidden",marginBottom:14,border:`1px solid ${C.cardBorder}`,
      cursor:"pointer",position:"relative",background:"#000"
    }}>
      <img src={thumbUrl} alt={ex.name} style={{width:"100%",display:"block",opacity:0.85}} />
      <div style={{
        position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:6,
        background:"linear-gradient(transparent 40%, rgba(0,0,0,0.5) 100%)"
      }}>
        <div style={{
          width:52,height:52,borderRadius:26,
          background:"rgba(255,255,255,0.95)",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 2px 12px rgba(0,0,0,0.3)"
        }}>
          <div style={{width:0,height:0,borderTop:"10px solid transparent",borderBottom:"10px solid transparent",borderLeft:"16px solid #FF2D55",marginLeft:3}}/>
        </div>
        <span style={{color:"#fff",fontSize:13,fontWeight:600,textShadow:"0 1px 4px rgba(0,0,0,0.5)"}}>
          Watch Exercise Demo
        </span>
      </div>
      <div style={{
        position:"absolute",bottom:8,left:10,right:10,
        display:"flex",justifyContent:"space-between",alignItems:"center"
      }}>
        <span style={{color:"#fff",fontSize:12,fontWeight:600,textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
          {ex.name} {ex.zh}
        </span>
        <span style={{
          background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:10,padding:"2px 6px",
          borderRadius:4,fontFamily:MONO
        }}>
          {ex.sets}×{ex.reps}{ex.hold>0?` · ${ex.hold}s`:""} 
        </span>
      </div>
    </div>
  );
}

function CircP({pct,sz=90,sw=7,clr=C.accent,bg="#E5E5EA",children}){
  const r=(sz-sw)/2,c=2*Math.PI*r;
  return(<div style={{position:"relative",width:sz,height:sz}}><svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={bg} strokeWidth={sw}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={clr} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c-(pct/100)*c} strokeLinecap="round" style={{transition:"stroke-dashoffset 0.8s ease"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>{children}</div></div>);
}

function Timer({exercise:ex,onComplete}){
  const[ph,setPh]=useState("ready");const[set,setSet]=useState(1);const[rep,setRep]=useState(1);const[tm,setTm]=useState(0);const ref=useRef(null);
  const dn=(set-1)*ex.reps+(rep-1),tot=ex.sets*ex.reps;
  useEffect(()=>()=>{if(ref.current)clearInterval(ref.current)},[]);
  const go=()=>{setPh("active");let t=Math.max(ex.hold,2);setTm(t);ref.current=setInterval(()=>{t--;setTm(t);if(t<=0){clearInterval(ref.current);if(rep>=ex.reps){if(set>=ex.sets){setPh("done");onComplete?.();}else{setPh("rest");let r=20;setTm(r);ref.current=setInterval(()=>{r--;setTm(r);if(r<=0){clearInterval(ref.current);setSet(s=>s+1);setRep(1);setPh("ready");}},1000);}}else{setRep(r=>r+1);setPh("ready");}}},1000);};
  const skip=()=>{if(ref.current)clearInterval(ref.current);setSet(s=>s+1);setRep(1);setPh("ready");};
  return(<div style={{background:C.card,borderRadius:16,padding:20,textAlign:"center",margin:"12px 0"}}>
    <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><CircP pct={(dn/tot)*100} sz={100} clr={C.accent} bg={C.border}><div style={{fontFamily:MONO,fontSize:28,fontWeight:700,color:C.text}}>{ph==="active"||ph==="rest"?tm:ph==="done"?"✓":"▶"}</div><div style={{fontSize:11,color:C.sub,fontWeight:500}}>{ph==="active"?"HOLD":ph==="rest"?"REST":ph==="done"?"DONE":"START"}</div></CircP></div>
    <div style={{fontSize:13,color:C.sub,fontFamily:MONO,marginBottom:12}}>Set {set}/{ex.sets} · Rep {rep}/{ex.reps}</div>
    {ph==="ready"&&<button onClick={go} style={{background:C.accent,border:"none",color:"#fff",padding:"12px 40px",borderRadius:50,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>{dn===0?"Start Exercise":"Next Rep"}</button>}
    {ph==="rest"&&<button onClick={skip} style={{background:"transparent",border:`1.5px solid ${C.border}`,color:C.text,padding:"10px 30px",borderRadius:50,fontSize:14,cursor:"pointer",fontFamily:SF}}>Skip Rest →</button>}
    {ph==="done"&&<div style={{background:"#E8FAF0",borderRadius:12,padding:12,fontSize:14,color:C.green,fontWeight:600}}>Exercise Complete!</div>}
  </div>);
}

// ─── Body Map ───
function BodyMap({onSelect}){
  const[view,setView]=useState("front");const[hov,setHov]=useState(null);
  const muscles=view==="front"?MUSCLES_DATA.front:MUSCLES_DATA.back;

  // More anatomically accurate body silhouette
  const bodyFront = "M 50 5 Q 45 5 43 8 Q 41 11 42 14 Q 43 16.5 46 17.5 L 47 18 Q 44 18.5 40 19.5 Q 34 21 30 23 Q 26 25 24 28 Q 22 32 21 37 Q 20 42 19.5 47 L 19 51 Q 20 51 21 49 Q 23 43 25 37 Q 27 32 29 29 L 33 26 Q 35 25 37 25.5 L 38 26 L 38 30 Q 37 36 37 42 Q 36 48 36 53 Q 35 58 35 63 Q 35 68 36 73 Q 36.5 76 37 78 L 37.5 80 Q 37 84 37 88 Q 36.5 92 36.5 96 Q 36.5 100 37.5 103 L 38 104 L 43 104 Q 44 102 44 99 Q 44 95 43.5 91 Q 43 87 43 83 L 43.5 80 Q 45 77 46 73 Q 47 69 47.5 65 L 50 63 L 52.5 65 Q 53 69 54 73 Q 55 77 56.5 80 L 57 83 Q 57 87 56.5 91 Q 56 95 56 99 Q 56 102 57 104 L 62 104 Q 63 102 63.5 100 Q 63.5 96 63 92 Q 63 88 63 84 L 62.5 80 L 63 78 Q 63.5 76 64 73 Q 65 68 65 63 Q 65 58 64 53 Q 64 48 63 42 Q 63 36 62 30 L 62 26 L 63 25.5 Q 65 25 67 26 L 71 29 Q 73 32 75 37 Q 77 43 79 49 Q 80 51 81 51 L 80.5 47 Q 80 42 79 37 Q 78 32 76 28 Q 74 25 70 23 Q 66 21 60 19.5 Q 56 18.5 53 18 L 54 17.5 Q 57 16.5 58 14 Q 59 11 57 8 Q 55 5 50 5 Z";
  const bodyBack = bodyFront; // Same silhouette, different muscles

  return(
    <div style={{background:"linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 100%)",borderRadius:20,padding:20,marginBottom:14,border:"1px solid rgba(255,255,255,0.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>ANATOMY</span>
        <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:10,padding:2}}>
          {["front","back"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"7px 18px",border:"none",borderRadius:8,background:view===v?"rgba(255,255,255,0.15)":"transparent",color:view===v?"#fff":"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:SF,transition:"all 0.2s"}}>{v==="front"?"Front":"Back"}</button>)}
        </div>
      </div>
      <div style={{maxWidth:300,margin:"0 auto",position:"relative"}}>
        <svg viewBox="0 0 100 110" style={{width:"100%",filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.3))"}}>
          <defs>
            {/* Gradients for each muscle to create depth */}
            {muscles.map(m=>(
              <linearGradient key={`g-${m.id}`} id={`grad-${m.id}`} x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity="1"/>
                <stop offset="100%" stopColor={m.color} stopOpacity="0.6"/>
              </linearGradient>
            ))}
            {/* Highlight gradient for hover */}
            <radialGradient id="hoverGlow" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
            </radialGradient>
            {/* Body base gradient */}
            <linearGradient id="bodyGrad" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#3A3A3C"/>
              <stop offset="50%" stopColor="#2C2C2E"/>
              <stop offset="100%" stopColor="#3A3A3C"/>
            </linearGradient>
            <linearGradient id="bodyStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0.04)"/>
            </linearGradient>
            {/* Fiber pattern */}
            <pattern id="fibers" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
            </pattern>
          </defs>

          {/* Subtle center line */}
          <line x1="50" y1="18" x2="50" y2="63" stroke="rgba(255,255,255,0.03)" strokeWidth="0.3" strokeDasharray="1,2"/>

          {/* Body silhouette — layered for depth */}
          <path d={view==="front"?bodyFront:bodyBack} fill="url(#bodyGrad)" stroke="url(#bodyStroke)" strokeWidth="0.4"/>
          {/* Fiber overlay on body */}
          <path d={view==="front"?bodyFront:bodyBack} fill="url(#fibers)" opacity="0.5"/>

          {/* Muscle groups with gradients and fiber details */}
          {muscles.map(m=>m.paths.map((p,i)=>(
            <g key={m.id+i}>
              {/* Shadow layer */}
              <path d={p} fill="rgba(0,0,0,0.3)" transform="translate(0.3, 0.4)" style={{filter:"blur(0.5px)"}}/>
              {/* Main muscle fill */}
              <path d={p}
                fill={hov===m.id?m.color:`url(#grad-${m.id})`}
                stroke={hov===m.id?"rgba(255,255,255,0.8)":m.color}
                strokeWidth={hov===m.id?"0.8":"0.4"}
                opacity={hov===m.id?1:0.85}
                style={{cursor:"pointer",transition:"all 0.2s ease"}}
                onClick={()=>onSelect(m)}
                onMouseEnter={()=>setHov(m.id)}
                onMouseLeave={()=>setHov(null)}
              />
              {/* Highlight sheen on hover */}
              {hov===m.id && <path d={p} fill="url(#hoverGlow)" style={{pointerEvents:"none"}}/>}
              {/* Fiber lines on muscles */}
              <path d={p} fill="url(#fibers)" style={{pointerEvents:"none"}} opacity="0.4"/>
            </g>
          )))}

          {/* Hover tooltip */}
          {hov&&(()=>{
            const m=muscles.find(x=>x.id===hov);if(!m)return null;
            return(
              <g style={{pointerEvents:"none"}}>
                <rect x="15" y="0" width="70" height="13" rx="5" fill="rgba(0,0,0,0.85)" stroke={m.color} strokeWidth="0.5"/>
                <text x="50" y="5.8" textAnchor="middle" fill="#fff" fontSize="3.8" fontWeight="700" fontFamily="-apple-system, sans-serif">{m.en}</text>
                <text x="50" y="10.5" textAnchor="middle" fill={m.color} fontSize="3" fontFamily="-apple-system, sans-serif">{m.zh}</text>
              </g>
            );
          })()}

          {/* Joint indicators */}
          {view==="front" && <>
            <circle cx="50" cy="77" r="1.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" strokeDasharray="0.8,0.8"/>
            <circle cx="50" cy="77" r="0.5" fill="rgba(255,255,255,0.15)"/>
            <circle cx="40" cy="100" r="1" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" strokeDasharray="0.6,0.6"/>
            <circle cx="60" cy="100" r="1" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" strokeDasharray="0.6,0.6"/>
          </>}
        </svg>

        {/* Legend */}
        <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:14,flexWrap:"wrap"}}>
          {muscles.map(m=>(
            <div key={m.id} onClick={()=>onSelect(m)} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",opacity:hov===m.id?1:0.65,transition:"opacity 0.2s",padding:"3px 0"}}
              onMouseEnter={()=>setHov(m.id)} onMouseLeave={()=>setHov(null)}>
              <div style={{width:9,height:9,borderRadius:5,background:m.color,boxShadow:hov===m.id?`0 0 6px ${m.color}`:""}}/>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:hov===m.id?700:500}}>{m.en}</span>
            </div>
          ))}
        </div>
      </div>
      <p style={{textAlign:"center",fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:12}}>Tap any muscle · 点击肌肉了解更多</p>
    </div>
  );
}

function MuscleModal({muscle:m,onClose}){
  const[selEx,setSelEx]=useState(null);
  const[showVid,setShowVid]=useState(false);
  const[completed,setCompleted]=useState([]);

  if(!m)return null;

  // Match muscle exercise names to actual EXERCISES database
  const matchedExercises = m.exercises.map(name => {
    const lower = name.toLowerCase();
    return EXERCISES.find(e => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase().split(" ")[0]));
  }).filter(Boolean);
  // Also find by target muscle
  const byTarget = EXERCISES.filter(e => {
    const t = e.target.toLowerCase();
    return t.includes(m.en.toLowerCase().split(" ")[0]) || m.en.toLowerCase().includes(t.split(" ")[0]);
  });
  const allMatched = [...matchedExercises];
  byTarget.forEach(e => { if (!allMatched.find(x => x.id === e.id)) allMatched.push(e); });

  // Exercise detail sub-modal
  if (selEx) return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}} onClick={()=>{setSelEx(null);setShowVid(false);}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:22,maxWidth:420,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        <button onClick={()=>{setSelEx(null);setShowVid(false);}} style={{background:C.card,border:"none",color:C.accent2,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:500,marginBottom:12}}>‹ Back to {m.en}</button>

        <div style={{display:"flex",gap:5,marginBottom:6}}>{selEx.safeFor.map(t=><span key={t} style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:t==="knee"?"#FFF0F3":t==="ankle"?"#FFF3E0":"#F0F4FF",color:t==="knee"?C.accent:t==="ankle"?"#E65100":C.accent2,fontWeight:600}}>{t==="knee"?"🦵 Knee":t==="ankle"?"🦶 Ankle":"💪 Upper"}</span>)}</div>
        <h2 style={{fontSize:24,fontWeight:700,margin:"0 0 1px"}}>{selEx.name}</h2>
        <div style={{fontSize:16,color:C.sub,marginBottom:2}}>{selEx.zh}</div>
        <div style={{fontSize:13,color:C.sub,marginBottom:2}}>{selEx.target}</div>
        <div style={{fontSize:11,color:"#B0B0B5",marginBottom:14}}>📚 {selEx.src}{selEx.gym?" · 🏢 Gym":""}</div>

        {/* Video preview */}
        <ExerciseAnim id={selEx.id}/>

        {/* Steps */}
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,border:`1px solid ${C.cardBorder}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10}}>HOW TO DO IT 动作要领</div>
          {selEx.steps.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:7}}>
            <div style={{width:22,height:22,borderRadius:11,flexShrink:0,background:"#FFF0F3",color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{i+1}</div>
            <p style={{fontSize:14,color:C.text,lineHeight:1.5,margin:0}}>{s}</p>
          </div>)}
        </div>

        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={{flex:1,background:"#F0F4FF",borderRadius:10,padding:12}}><div style={{fontSize:11,fontWeight:700,color:C.accent2,marginBottom:3}}>💡 Tip</div><div style={{fontSize:13,color:C.text,lineHeight:1.4}}>{selEx.tip}</div></div>
          <div style={{flex:1,background:"#FFF3E0",borderRadius:10,padding:12}}><div style={{fontSize:11,fontWeight:700,color:"#E65100",marginBottom:3}}>⚠️ Caution</div><div style={{fontSize:13,color:C.text,lineHeight:1.4}}>{selEx.warn}</div></div>
        </div>

        <div style={{fontSize:13,color:C.sub,textAlign:"center",marginBottom:8,fontFamily:MONO}}>{selEx.sets} sets × {selEx.reps} reps{selEx.hold>0?` · ${selEx.hold}s hold`:""}</div>

        <Timer key={selEx.id} exercise={selEx} onComplete={()=>setCompleted(p=>[...p,selEx.id])}/>
        {completed.includes(selEx.id)&&<div style={{textAlign:"center",padding:10,color:C.green,fontSize:14,fontWeight:600}}>✓ Completed!</div>}
      </div>
    </div>
  );

  // Main muscle modal
  return(<div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:24,maxWidth:400,width:"100%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div><h3 style={{fontSize:22,fontWeight:700,color:C.text,margin:0}}>{m.en}</h3><div style={{fontSize:15,color:m.color,fontWeight:600}}>{m.zh}</div></div><button onClick={onClose} style={{background:C.card,border:"none",color:C.sub,width:32,height:32,borderRadius:16,cursor:"pointer",fontSize:16,fontWeight:600}}>✕</button></div>
      <div style={{background:C.card,borderRadius:12,padding:16,marginBottom:12}}><p style={{fontSize:14,color:C.text,lineHeight:1.6,margin:"0 0 6px"}}>{m.desc_en}</p><p style={{fontSize:13,color:C.sub,lineHeight:1.5,margin:0}}>{m.desc_zh}</p></div>

      {/* Clickable exercises */}
      <div style={{background:"#FFF0F3",borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:10}}>BEST EXERCISES 最佳练习</div>
        {allMatched.length > 0 ? allMatched.map((ex,i)=>(
          <div key={ex.id} onClick={()=>setSelEx(ex)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<allMatched.length-1?`1px solid rgba(255,45,85,0.1)`:"none",cursor:"pointer"}}>
            <div style={{width:32,height:32,borderRadius:10,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",flexShrink:0}}>▶</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>{ex.name}</div>
              <div style={{fontSize:12,color:C.sub}}>{ex.zh} · {ex.target}</div>
            </div>
            {ex.gym&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:"#F0F4FF",color:C.accent2,fontWeight:700}}>GYM</span>}
            <span style={{color:C.border,fontSize:14}}>›</span>
          </div>
        )) : m.exercises.map((e,i)=><div key={i} style={{fontSize:14,color:C.text,padding:"4px 0"}}>• {e}</div>)}
        {allMatched.length>0&&<div style={{fontSize:11,color:C.sub,marginTop:8,textAlign:"center"}}>Tap any exercise for video & instructions 点击查看视频和说明</div>}
      </div>

      <div style={{background:"#F0F4FF",borderRadius:12,padding:16}}><div style={{fontSize:12,fontWeight:700,color:C.accent2,marginBottom:8}}>REHAB TIPS 康复建议</div><p style={{fontSize:13,color:C.text,lineHeight:1.5,margin:"0 0 4px"}}>{m.tips_en}</p><p style={{fontSize:13,color:C.sub,lineHeight:1.5,margin:0}}>{m.tips_zh}</p></div>
    </div>
  </div>);
}

// ─── AI Chat ───
function useDrag(initX, initY) {
  const [pos, setPos] = useState({ x: initX, y: initY });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const onStart = useCallback((e) => {
    dragging.current = true;
    moved.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    offset.current = { x: clientX - pos.x, y: clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      moved.current = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const nx = Math.max(0, Math.min(window.innerWidth - 60, clientX - offset.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, clientY - offset.current.y));
      setPos({ x: nx, y: ny });
    };
    const onEnd = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  return { pos, onStart, wasDragged: () => moved.current };
}

function AIChatbot(){
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{role:"ai",text:"Hi! I'm your rehab assistant 🩺\nAsk about knee/ankle recovery in English or 中文!"}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  // Draggable FAB
  const fab = useDrag(window.innerWidth - 64, window.innerHeight - 140);
  // Draggable chat window
  const win = useDrag(Math.max(10, window.innerWidth - 350), Math.max(60, window.innerHeight - 530));

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs]);

  const CHAT_LIMIT = 3;

  const send = async () => {
    if (!input.trim() || loading) return;
    const um = input.trim(); setInput("");
    const cn = /[\u4e00-\u9fff]/.test(um);

    const used = parseInt(localStorage.getItem("chat_count") || "0", 10);
    if (used >= CHAT_LIMIT) {
      setMsgs(p => [...p, { role: "user", text: um }, { role: "ai", text: cn ? `已达每用户 ${CHAT_LIMIT} 次提问上限。` : `You've reached the ${CHAT_LIMIT}-message limit.` }]);
      return;
    }

    setMsgs(p => [...p, { role: "user", text: um }]);
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.slice(1).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })).concat({ role: "user", content: um })
        })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      localStorage.setItem("chat_count", String(used + 1));
      const remaining = CHAT_LIMIT - (used + 1);
      const note = remaining > 0
        ? (cn ? `\n\n（剩余 ${remaining} 次）` : `\n\n(${remaining} message${remaining === 1 ? "" : "s"} left)`)
        : (cn ? `\n\n（已达上限）` : `\n\n(limit reached)`);
      setMsgs(p => [...p, { role: "ai", text: (d.text || (cn ? "抱歉，请稍后再试。" : "Sorry, please try again.")) + note }]);
    } catch (e) {
      console.error("Chat error:", e);
      setMsgs(p => [...p, { role: "ai", text: cn ? "抱歉，请稍后再试。" : "Sorry, please try again." }]);
    }
    setLoading(false);
  };

  if (!open) return (
    <div
      onMouseDown={fab.onStart} onTouchStart={fab.onStart}
      style={{ position: "fixed", left: fab.pos.x, top: fab.pos.y, zIndex: 1100, touchAction: "none" }}>
      <button onClick={() => { if (!fab.wasDragged()) setOpen(true); }}
        style={{ width: 48, height: 48, borderRadius: 24, background: C.accent2, border: "none", cursor: "grab", fontSize: 20, color: "#fff", boxShadow: "0 4px 16px rgba(0,122,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        💬
      </button>
    </div>
  );

  return (
    <div style={{ position: "fixed", left: win.pos.x, top: win.pos.y, zIndex: 2100, width: 340, maxWidth: "calc(100vw - 20px)", height: 450, maxHeight: "68vh", background: "#fff", borderRadius: 20, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,0.12)", touchAction: "none" }}>
      {/* Draggable header */}
      <div onMouseDown={win.onStart} onTouchStart={win.onStart}
        style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "grab", userSelect: "none", borderRadius: "20px 20px 0 0" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Rehab AI 康复助手</div>
          <div style={{ fontSize: 11, color: C.sub }}>Drag header to move · English / 中文</div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: C.card, border: "none", color: C.sub, width: 28, height: 28, borderRadius: 14, cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      {/* Messages */}
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            <div style={{ background: m.role === "user" ? C.accent2 : C.card, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, color: m.role === "user" ? "#fff" : C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start" }}><div style={{ background: C.card, borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, color: C.sub }}>Thinking...</div></div>}
      </div>
      {/* Input */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Ask a question..."
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 14, fontFamily: SF, outline: "none" }} />
        <button onClick={send} disabled={loading}
          style={{ background: C.accent2, border: "none", color: "#fff", width: 38, height: 38, borderRadius: 19, cursor: "pointer", fontSize: 16, opacity: loading ? 0.5 : 1 }}>↑</button>
      </div>
    </div>
  );
}

// ═══ APP ═══
export default function App(){
  const[scr,setScr]=useState("profile");const[ci,setCi]=useState({pain:0,swelling:0,mood:3,areas:["knee","ankle","upper"]});
  const[profile,setProfile]=useState({age:"",height:"",weight:"",level:"beginner",gender:"female",hasGym:false,saved:false});
  const[wo,setWo]=useState(null);const[hist,setHist]=useState({});const[done,setDone]=useState([]);
  const[selEx,setSelEx]=useState(null);const[showVid,setShowVid]=useState(false);
  const[wg,setWg]=useState({d:4});const[gi,setGi]=useState(4);const[sr,setSr]=useState("7");
  const[rd,setRd]=useState([1,3,5]);const[rt,setRt]=useState("09:00");const[rs,setRs]=useState(false);
  const[libOpen,setLibOpen]=useState(false);
  const[fade,setFade]=useState(true);const[selM,setSelM]=useState(null);
  const[exReturn,setExReturn]=useState("plan");
  const exScrollYRef=useRef(0);
  const[userId,setUserId]=useState(null);

  // Bootstrap: anon auth + hydrate from Supabase
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const user=await ensureSession();
      if(cancelled||!user)return;
      const data=await loadAll(user.id);
      if(cancelled||!data)return;
      setUserId(user.id);
      if(data.profile){
        const p={age:data.profile.age||"",height:data.profile.height||"",weight:data.profile.weight||"",level:data.profile.level||"beginner",gender:data.profile.gender||"female",hasGym:!!data.profile.has_gym,saved:true};
        setProfile(p);
        setScr("checkin");
      }
      if(data.settings){
        const wgd=data.settings.weekly_goal_days??4;
        setWg({d:wgd});setGi(wgd);
        setRd(data.settings.reminder_days||[1,3,5]);
        setRt(data.settings.reminder_time||"09:00");
        setRs(!!data.settings.reminder_on);
      }
      const histMap={};let todayLog=null;const today=tod();
      for(const r of (data.logs||[])){
        const k=r.date;
        histMap[k]={checkin:{pain:r.pain||0,swelling:r.swelling||0,mood:r.mood??3,areas:r.areas||[]},completed:r.completed||[],date:k};
        if(k===today)todayLog=histMap[k];
      }
      setHist(histMap);
      if(todayLog){
        setCi(todayLog.checkin);
        setDone(todayLog.completed||[]);
        if(data.profile){
          const pforGen={level:data.profile.level||"beginner",hasGym:!!data.profile.has_gym,age:data.profile.age||"30",weight:data.profile.weight||"60"};
          setWo(genWorkout(todayLog.checkin,histMap,pforGen));
        }
      }
    })();
    return()=>{cancelled=true;};
  },[]);

  const nav=useCallback((t,d)=>{
    const currentY=window.scrollY;
    setFade(false);setShowVid(false);
    setTimeout(()=>{
      setScr(t);
      if(d?.ex)setSelEx(d.ex);
      if(d?.from){setExReturn(d.from);exScrollYRef.current=currentY;}
      setFade(true);
      if(d?.restoreScroll){
        requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,exScrollYRef.current)));
      }else{
        window.scrollTo(0,0);
      }
    },150);
  },[]);
  const comp=(id)=>{setDone(p=>p.includes(id)?p:[...p,id]);const k=tod();setHist(p=>{const nextLog={checkin:ci,completed:[...(p[k]?.completed||[]),id],date:k};if(userId)saveDailyLog(userId,k,nextLog);return{...p,[k]:nextLog};});};
  const submit=()=>{setWo(genWorkout(ci,hist,profile));setDone([]);nav("plan");};

  const stats=useMemo(()=>{const d=parseInt(sr),e=[];for(let i=0;i<d;i++){const dt=new Date();dt.setDate(dt.getDate()-i);const k=dk(dt);if(hist[k])e.push(hist[k]);}return{tw:e.length,te:e.reduce((s,x)=>s+(x.completed?.length||0),0),ap:e.length?(e.reduce((s,x)=>s+(x.checkin?.pain||0),0)/e.length).toFixed(1):"—",am:e.length?(e.reduce((s,x)=>s+(x.checkin?.mood||0),0)/e.length).toFixed(1):"—",pt:e.length>=2?(e[0]?.checkin?.pain||0)-(e[e.length-1]?.checkin?.pain||0):0,e};},[hist,sr]);
  const wp=useMemo(()=>{let c=0;for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-d.getDay()+i);if(hist[dk(d)])c++;}return c;},[hist]);
  const plan=wo?.exercises||[];const pp=plan.length?Math.round((done.length/plan.length)*100):0;

  // ─── Progression Tracking (visible to user) ───
  const prog = useMemo(() => {
    const last7 = [];
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = dk(d); if (hist[k]) last7.push(hist[k]); }
    const recentIds = new Set(); last7.forEach(d => (d.completed || []).forEach(id => recentIds.add(id)));
    const p1Done = EXERCISES.filter(e => e.phase === 1 && recentIds.has(e.id)).length;
    const p1Total = EXERCISES.filter(e => e.phase === 1).length;
    const p2Done = EXERCISES.filter(e => e.phase === 2 && recentIds.has(e.id)).length;
    const p2Total = EXERCISES.filter(e => e.phase === 2).length;
    const p3Done = EXERCISES.filter(e => e.phase === 3 && recentIds.has(e.id)).length;
    const p3Total = EXERCISES.filter(e => e.phase === 3).length;
    const sessions = last7.length;
    const avgPain = last7.length ? last7.reduce((s, x) => s + (x.checkin?.pain || 0), 0) / last7.length : 5;
    const avgSwell = last7.length ? last7.reduce((s, x) => s + (x.checkin?.swelling || 0), 0) / last7.length : 5;

    let currentPhase = 1, nextReqs = [], nextPct = 0;
    if (p2Done >= p2Total * 0.6 && sessions >= 5 && avgPain <= 1 && avgSwell <= 0.5) {
      currentPhase = 3; nextReqs = ["You're at the highest phase!"]; nextPct = 100;
    } else if (p1Done >= p1Total * 0.7 && sessions >= 3 && avgPain <= 1.5 && avgSwell <= 1) {
      currentPhase = 2;
      const reqs = [];
      if (p2Done < p2Total * 0.6) reqs.push(`Complete ${Math.ceil(p2Total * 0.6) - p2Done} more Phase 2 exercises`);
      if (sessions < 5) reqs.push(`${5 - sessions} more sessions this week`);
      if (avgPain > 1) reqs.push("Maintain pain level ≤ 1");
      if (avgSwell > 0.5) reqs.push("Reduce swelling further");
      nextReqs = reqs.length ? reqs : ["Keep going — almost Phase 3!"];
      nextPct = Math.min(95, Math.round(((p2Done / Math.max(1, Math.ceil(p2Total * 0.6))) * 40 + (Math.min(sessions, 5) / 5) * 30 + (avgPain <= 1 ? 15 : 0) + (avgSwell <= 0.5 ? 15 : 0))));
    } else {
      const reqs = [];
      if (p1Done < p1Total * 0.7) reqs.push(`Complete ${Math.ceil(p1Total * 0.7) - p1Done} more Phase 1 exercises`);
      if (sessions < 3) reqs.push(`${3 - sessions} more sessions this week`);
      if (avgPain > 1.5) reqs.push("Get pain below 'Moderate'");
      if (avgSwell > 1) reqs.push("Reduce swelling level");
      nextReqs = reqs.length ? reqs : ["Great start — keep building!"];
      nextPct = Math.min(95, Math.round(((p1Done / Math.max(1, Math.ceil(p1Total * 0.7))) * 40 + (Math.min(sessions, 3) / 3) * 30 + (avgPain <= 1.5 ? 15 : 0) + (avgSwell <= 1 ? 15 : 0))));
    }
    return { currentPhase, nextPct, nextReqs, sessions, p1Done, p1Total, p2Done, p2Total, p3Done, p3Total };
  }, [hist]);

  return(<div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:SF}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;background:${C.border};}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${C.accent};cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.15);}`}</style>

    {/* Tab Bar */}
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:900,background:"rgba(255,255,255,0.92)",backdropFilter:"blur(20px)",borderTop:`0.5px solid ${C.border}`,display:"flex",padding:"6px 0 env(safe-area-inset-bottom, 8px)"}}>
      {[{id:"checkin",ic:"🩺",l:"Check-in"},{id:"plan",ic:"🏋️",l:"Today"},{id:"anatomy",ic:"🏃",l:"Body"},{id:"goals",ic:"🎯",l:"Goals"},{id:"summary",ic:"📊",l:"Summary"},{id:"profile",ic:"👤",l:"Profile"}].map(t=>(
        <button key={t.id} onClick={()=>nav(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:scr===t.id?C.accent:C.sub,fontSize:18,padding:"4px 0",fontFamily:SF}}>
          <span>{t.ic}</span><span style={{fontSize:10,fontWeight:scr===t.id?600:500}}>{t.l}</span>
        </button>
      ))}
    </div>

    <div style={{opacity:fade?1:0,transform:fade?"translateY(0)":"translateY(6px)",transition:"all 0.15s",paddingBottom:"calc(90px + env(safe-area-inset-bottom, 0px))"}}>

      {/* CHECK-IN */}
      {scr==="checkin"&&<div style={{padding:"0 20px",maxWidth:520,margin:"0 auto"}}>
        <div style={{padding:"50px 0 20px",animation:"fadeUp 0.4s ease"}}>
          <h1 style={{fontSize:34,fontWeight:700,letterSpacing:-0.5,marginBottom:4}}>
            {new Date().getHours()<12?"Good Morning":new Date().getHours()<17?"Good Afternoon":"Good Evening"}
          </h1>
          <p style={{fontSize:17,color:C.sub,fontWeight:400}}>How are you feeling today?</p>
          <p style={{fontSize:14,color:C.sub}}>今天感觉怎么样？</p>
        </div>

        {/* ─── Progression Card ─── */}
        <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:14,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.4s ease 0.02s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:0.5,marginBottom:14}}>YOUR REHAB JOURNEY</div>
          {/* Phase indicators */}
          <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:16}}>
            {[1,2,3].map(p => {
              const isActive = prog.currentPhase >= p;
              const isCurrent = prog.currentPhase === p;
              return (
                <div key={p} style={{display:"flex",alignItems:"center",flex:1}}>
                  <div style={{
                    width:isCurrent?44:36, height:isCurrent?44:36, borderRadius:isCurrent?22:18,
                    background:isActive ? (p===1?C.green:p===2?C.accent2:C.accent) : C.card,
                    border:isCurrent ? `3px solid ${p===1?C.green:p===2?C.accent2:C.accent}` : isActive ? "none" : `2px solid ${C.border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    flexDirection:"column", transition:"all 0.3s",
                    boxShadow: isCurrent ? `0 2px 12px ${p===1?C.green:p===2?C.accent2:C.accent}33` : "none"
                  }}>
                    <div style={{fontSize:isCurrent?16:13,fontWeight:700,color:isActive?"#fff":C.sub}}>{isActive && !isCurrent ? "✓" : p}</div>
                  </div>
                  {p < 3 && <div style={{flex:1,height:3,background:prog.currentPhase>p ? (p===1?C.green:C.accent2) : C.border,borderRadius:2,margin:"0 4px",transition:"background 0.5s"}}/>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,marginTop:-4}}>
            <span style={{fontSize:11,color:prog.currentPhase>=1?C.green:C.sub,fontWeight:600,textAlign:"center",flex:1}}>Foundation</span>
            <span style={{fontSize:11,color:prog.currentPhase>=2?C.accent2:C.sub,fontWeight:600,textAlign:"center",flex:1}}>Building</span>
            <span style={{fontSize:11,color:prog.currentPhase>=3?C.accent:C.sub,fontWeight:600,textAlign:"center",flex:1}}>Advanced</span>
          </div>

          {/* Progress to next phase */}
          {prog.currentPhase < 3 ? (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600,color:C.text}}>Phase {prog.currentPhase + 1} Progress</span>
                <span style={{fontSize:13,fontWeight:700,color:C.accent,fontFamily:MONO}}>{prog.nextPct}%</span>
              </div>
              <div style={{height:8,background:C.card,borderRadius:4,overflow:"hidden",marginBottom:10,border:`1px solid ${C.border}`}}>
                <div style={{height:"100%",width:`${prog.nextPct}%`,background:`linear-gradient(90deg,${C.accent},#FF6482)`,borderRadius:4,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{fontSize:12,color:C.sub,lineHeight:1.6}}>
                <div style={{fontWeight:600,marginBottom:4,color:C.text}}>To unlock Phase {prog.currentPhase + 1}:</div>
                {prog.nextReqs.map((r,i) => <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:C.orange,fontSize:10,marginTop:2}}>●</span><span>{r}</span></div>)}
              </div>
            </div>
          ) : (
            <div style={{background:"#E8FAF0",borderRadius:12,padding:14,textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:4}}>🏆</div>
              <div style={{fontSize:15,fontWeight:700,color:C.green}}>Maximum Phase Reached!</div>
              <div style={{fontSize:12,color:C.sub,marginTop:2}}>Keep maintaining consistency</div>
            </div>
          )}

          {/* Quick stats */}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <div style={{flex:1,background:C.card,borderRadius:10,padding:10,textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:C.accent2,fontFamily:MONO}}>{prog.sessions}</div>
              <div style={{fontSize:10,color:C.sub,fontWeight:600}}>Sessions (7d)</div>
            </div>
            <div style={{flex:1,background:C.card,borderRadius:10,padding:10,textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:C.green,fontFamily:MONO}}>{prog.p1Done+prog.p2Done+prog.p3Done}</div>
              <div style={{fontSize:10,color:C.sub,fontWeight:600}}>Unique Exercises</div>
            </div>
            <div style={{flex:1,background:C.card,borderRadius:10,padding:10,textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:C.accent,fontFamily:MONO}}>Phase {prog.currentPhase}</div>
              <div style={{fontSize:10,color:C.sub,fontWeight:600}}>Current Level</div>
            </div>
          </div>
        </div>
        {[{k:"mood",t:"Energy 精力",el:<div style={{display:"flex",gap:6}}>{MOODS.map(m=><button key={m.v} onClick={()=>setCi(c=>({...c,mood:m.v}))} style={{flex:1,background:ci.mood===m.v?"#FFF0F3":"#fff",border:ci.mood===m.v?`2px solid ${C.accent}`:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:28}}>{m.emoji}</span><span style={{fontSize:11,color:ci.mood===m.v?C.accent:C.sub,fontWeight:600}}>{m.l}</span></button>)}</div>},
          {k:"pain",t:"Pain Level 疼痛",el:<div style={{display:"flex",gap:5}}>{PAIN.map(p=><button key={p.v} onClick={()=>setCi(c=>({...c,pain:p.v}))} style={{flex:1,padding:"12px 2px",borderRadius:12,cursor:"pointer",background:ci.pain===p.v?`${p.c}18`:"#fff",border:ci.pain===p.v?`2px solid ${p.c}`:`1.5px solid ${C.border}`}}><div style={{fontSize:11,color:ci.pain===p.v?p.c:C.sub,fontWeight:700}}>{p.l}</div></button>)}</div>},
          {k:"swell",t:"Swelling 肿胀",el:<div style={{display:"flex",gap:6}}>{SWELL.map(s=><button key={s.v} onClick={()=>setCi(c=>({...c,swelling:s.v}))} style={{flex:1,padding:"13px 3px",borderRadius:12,cursor:"pointer",background:ci.swelling===s.v?`${s.c}18`:"#fff",border:ci.swelling===s.v?`2px solid ${s.c}`:`1.5px solid ${C.border}`}}><div style={{fontSize:12,color:ci.swelling===s.v?s.c:C.sub,fontWeight:700}}>{s.l}</div></button>)}</div>},
          {k:"areas",t:"Focus Areas 重点",el:<div style={{display:"flex",gap:8}}>{[{id:"knee",em:"🦵",l:"Knee 半月板"},{id:"ankle",em:"🦶",l:"Ankle 脚踝"},{id:"upper",em:"💪",l:"Upper Body 上肢"}].map(a=><button key={a.id} onClick={()=>setCi(c=>({...c,areas:c.areas.includes(a.id)?c.areas.filter(x=>x!==a.id):[...c.areas,a.id]}))} style={{flex:1,padding:"16px 6px",borderRadius:16,cursor:"pointer",background:ci.areas.includes(a.id)?"#FFF0F3":"#fff",border:ci.areas.includes(a.id)?`2px solid ${C.accent}`:`1.5px solid ${C.border}`,textAlign:"center"}}><div style={{fontSize:28,marginBottom:4}}>{a.em}</div><div style={{fontSize:12,color:ci.areas.includes(a.id)?C.accent:C.sub,fontWeight:600}}>{a.l}</div></button>)}</div>},
        ].map((s,i)=><div key={s.k} style={{background:"#fff",borderRadius:16,padding:20,marginBottom:12,border:`1px solid ${C.cardBorder}`,animation:`fadeUp 0.35s ease ${i*0.04}s both`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:0.5,marginBottom:12}}>{s.t.toUpperCase()}</div>{s.el}
        </div>)}
        <button onClick={submit} disabled={ci.areas.length===0} style={{background:C.accent,border:"none",color:"#fff",width:"100%",padding:16,borderRadius:14,fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,opacity:ci.areas.length===0?0.4:1,animation:"fadeUp 0.4s ease 0.2s both"}}>Build My Workout →</button>
      </div>}

      {/* PLAN */}
      {scr==="plan"&&<div style={{padding:"0 20px",maxWidth:520,margin:"0 auto"}}>
        <div style={{padding:"46px 0 16px",animation:"fadeUp 0.4s ease"}}>
          <h1 style={{fontSize:34,fontWeight:700,letterSpacing:-0.5,marginBottom:4}}>Today</h1>
          {wo&&<>
            {/* Phase Badge */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{display:"flex",gap:4}}>
                {[1,2,3].map(p=><div key={p} style={{width:28,height:28,borderRadius:14,background:prog.currentPhase>=p?(p===1?C.green:p===2?C.accent2:C.accent):C.card,border:prog.currentPhase>=p?"none":`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:prog.currentPhase>=p?"#fff":C.sub,transition:"all 0.3s"}}>{prog.currentPhase>=p&&prog.currentPhase!==p?"✓":p}</div>)}
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>Phase {prog.currentPhase}: {prog.currentPhase===1?"Foundation":prog.currentPhase===2?"Building":"Advanced"}</div>
                <div style={{fontSize:12,color:C.sub}}>{prog.nextPct<100?`${prog.nextPct}% to Phase ${prog.currentPhase+1}`:"Max phase reached"}</div>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:14,padding:16,marginBottom:14,border:`1px solid ${C.cardBorder}`}}>
              <p style={{fontSize:15,color:C.text,lineHeight:1.6,margin:0,fontWeight:500}}>{wo.note}</p>
              {wo.progression&&<div style={{background:"#FFF8E1",borderRadius:10,padding:10,marginTop:10,fontSize:13,color:"#F57F17",fontWeight:600}}>{wo.progression}</div>}
              <div style={{display:"flex",gap:16,marginTop:10,fontSize:13,color:C.sub}}><span>⏱ ~{wo.est} min</span><span>📋 {plan.length} exercises</span></div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.sub,marginBottom:6}}><span>Progress</span><span style={{fontFamily:MONO,fontWeight:600,color:C.accent}}>{done.length}/{plan.length}</span></div>
              <div style={{height:6,background:C.card,borderRadius:3,overflow:"hidden",border:`1px solid ${C.border}`}}><div style={{height:"100%",width:`${pp}%`,background:`linear-gradient(90deg,${C.accent},#FF6482)`,borderRadius:3,transition:"width 0.5s"}}/></div>
            </div>
          </>}
        </div>
        {plan.map((ex,i)=>{const d=done.includes(ex.id);return(<div key={ex.id} onClick={()=>{setSelEx(ex);nav("exercise",{ex,from:"plan"})}} style={{background:"#fff",border:`1px solid ${d?"#D4EDDA":C.cardBorder}`,borderRadius:14,padding:16,marginBottom:8,cursor:"pointer",animation:`fadeUp 0.3s ease ${i*0.03}s both`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:19,background:d?C.green:C.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:d?16:14,color:d?"#fff":C.sub,fontWeight:700,border:d?"none":`1px solid ${C.border}`}}>{d?"✓":i+1}</div>
            <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontSize:16,fontWeight:600}}>{ex.name}</span><span style={{fontSize:13,color:C.sub}}>{ex.zh}</span>{ex.gym&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"#F0F4FF",color:C.accent2,fontWeight:700}}>🏢 GYM</span>}</div><div style={{fontSize:13,color:C.sub,marginTop:1}}>{ex.target} · {ex.sets}×{ex.reps}</div><div style={{fontSize:11,color:"#B0B0B5",marginTop:2}}>{ex.src}</div></div>
            <span style={{color:C.border,fontSize:16}}>›</span>
          </div></div>);})}
        {pp===100&&<div style={{background:"#E8FAF0",borderRadius:16,padding:22,textAlign:"center",marginTop:8,border:`1px solid #C8E6C9`}}><div style={{fontSize:34}}>🎉</div><div style={{fontSize:18,fontWeight:700,color:C.green,marginTop:4}}>Session Complete!</div><div style={{fontSize:14,color:C.sub,marginTop:4}}>Well done. 做得好！</div></div>}
        {!wo&&<div style={{textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:40,marginBottom:12}}>🩺</div><p style={{fontSize:16,color:C.sub}}>Complete your check-in first</p><button onClick={()=>nav("checkin")} style={{background:C.accent,border:"none",color:"#fff",padding:"12px 32px",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",marginTop:16,fontFamily:SF}}>Check-in</button></div>}
      </div>}

      {/* EXERCISE */}
      {scr==="exercise"&&selEx&&<div style={{padding:"0 20px",maxWidth:520,margin:"0 auto"}}>
        <button onClick={()=>nav(exReturn,{restoreScroll:true})} style={{background:"none",border:"none",color:C.accent2,padding:"18px 0",cursor:"pointer",fontSize:15,fontFamily:SF,fontWeight:500}}>‹ {exReturn==="summary"?"Summary":"Today"}</button>
        <div style={{animation:"fadeUp 0.3s ease"}}>
          <div style={{display:"flex",gap:6,marginBottom:8}}>{selEx.safeFor.map(t=><span key={t} style={{fontSize:12,padding:"4px 10px",borderRadius:8,background:t==="knee"?"#FFF0F3":t==="ankle"?"#FFF3E0":"#F0F4FF",color:t==="knee"?C.accent:t==="ankle"?"#E65100":C.accent2,fontWeight:600}}>{t==="knee"?"🦵 Knee":t==="ankle"?"🦶 Ankle":"💪 Upper"}</span>)}</div>
          <h1 style={{fontSize:28,fontWeight:700,letterSpacing:-0.3,marginBottom:1}}>{selEx.name}</h1>
          <div style={{fontSize:17,color:C.sub,marginBottom:2}}>{selEx.zh}</div>
          <p style={{fontSize:15,color:C.sub,marginBottom:2}}>{selEx.target}</p>
          <p style={{fontSize:12,color:"#B0B0B5",marginBottom:16}}>📚 {selEx.src}</p>
          <ExerciseAnim id={selEx.id}/>
          <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:12,border:`1px solid ${C.cardBorder}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>HOW TO DO IT</div>
            {selEx.steps.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:8}}><div style={{width:22,height:22,borderRadius:11,flexShrink:0,background:"#FFF0F3",color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{i+1}</div><p style={{fontSize:15,color:C.text,lineHeight:1.5,margin:0}}>{s}</p></div>)}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <div style={{flex:1,background:"#F0F4FF",borderRadius:12,padding:14}}><div style={{fontSize:12,fontWeight:700,color:C.accent2,marginBottom:4}}>💡 Tip</div><div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{selEx.tip}</div></div>
            <div style={{flex:1,background:"#FFF3E0",borderRadius:12,padding:14}}><div style={{fontSize:12,fontWeight:700,color:"#E65100",marginBottom:4}}>⚠️ Caution</div><div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{selEx.warn}</div></div>
          </div>
          <Timer key={selEx.id} exercise={selEx} onComplete={()=>comp(selEx.id)}/>
          {!done.includes(selEx.id)?<button onClick={()=>comp(selEx.id)} style={{width:"100%",padding:14,borderRadius:12,border:`1.5px solid ${C.border}`,background:"#fff",color:C.sub,fontSize:15,cursor:"pointer",marginTop:6,fontFamily:SF}}>Mark as Complete ✓</button>
          :<div style={{textAlign:"center",padding:12,color:C.green,fontSize:15,fontWeight:600}}>✓ Completed</div>}
        </div>
      </div>}

      {/* ANATOMY */}
      {scr==="anatomy"&&<div style={{padding:"0 20px",maxWidth:520,margin:"0 auto"}}>
        <div style={{padding:"46px 0 16px",animation:"fadeUp 0.4s ease"}}><h1 style={{fontSize:34,fontWeight:700,letterSpacing:-0.5}}>Body</h1><p style={{fontSize:15,color:C.sub}}>Tap any muscle for exercises & tips</p></div>
        <BodyMap onSelect={setSelM}/>
      </div>}

      {/* GOALS */}
      {scr==="goals"&&<div style={{padding:"0 20px",maxWidth:520,margin:"0 auto"}}>
        <div style={{padding:"46px 0 16px",animation:"fadeUp 0.4s ease"}}><h1 style={{fontSize:34,fontWeight:700,letterSpacing:-0.5}}>Goals</h1></div>
        <div style={{background:"#fff",borderRadius:16,padding:24,textAlign:"center",marginBottom:14,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.4s ease 0.05s both"}}>
          <CircP pct={Math.min(100,(wp/wg.d)*100)} sz={120} sw={10} clr={wp>=wg.d?C.green:C.accent} bg={C.border}><div style={{fontFamily:MONO,fontSize:30,fontWeight:700}}>{wp}</div><div style={{fontSize:12,color:C.sub}}>of {wg.d} days</div></CircP>
          <div style={{marginTop:12,fontSize:15,fontWeight:600,color:wp>=wg.d?C.green:C.text}}>{wp>=wg.d?"🎉 Goal reached!":"Keep going!"}</div>
          <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:14}}>{DAYS.map((d,i)=>{const dt=new Date();dt.setDate(dt.getDate()-dt.getDay()+i);const dn=!!hist[dk(dt)];return(<div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{width:32,height:32,borderRadius:16,background:dn?C.green:C.card,border:i===new Date().getDay()?`2px solid ${C.accent}`:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:dn?"#fff":C.sub,fontWeight:600}}>{dn?"✓":""}</div><span style={{fontSize:10,fontWeight:600,color:i===new Date().getDay()?C.accent:C.sub}}>{d}</span></div>);})}</div>
        </div>

        {/* Phase Progression Timeline */}
        <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:14,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.4s ease 0.08s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:16}}>PHASE PROGRESSION</div>
          {[
            {p:1,name:"Foundation 基础",sub:"Gentle activation & mobility",clr:C.green,done:prog.p1Done,total:prog.p1Total},
            {p:2,name:"Building 增强",sub:"Strength & weight-bearing",clr:C.accent2,done:prog.p2Done,total:prog.p2Total},
            {p:3,name:"Advanced 进阶",sub:"Functional & balance training",clr:C.accent,done:prog.p3Done,total:prog.p3Total},
          ].map((ph,i) => {
            const active = prog.currentPhase >= ph.p;
            const current = prog.currentPhase === ph.p;
            const pct = ph.total ? Math.round((ph.done / ph.total) * 100) : 0;
            return (
              <div key={ph.p} style={{display:"flex",gap:14,marginBottom:i<2?20:0,position:"relative"}}>
                {/* Timeline line */}
                {i < 2 && <div style={{position:"absolute",left:17,top:36,width:2,height:"calc(100% - 16px)",background:active?ph.clr:C.border,transition:"background 0.5s"}}/>}
                {/* Circle */}
                <div style={{width:36,height:36,borderRadius:18,background:active?ph.clr:C.card,border:active?"none":`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,transition:"all 0.3s",boxShadow:current?`0 2px 10px ${ph.clr}33`:"none"}}>
                  <span style={{fontSize:active&&!current?14:13,fontWeight:700,color:active?"#fff":C.sub}}>{active&&!current?"✓":ph.p}</span>
                </div>
                {/* Content */}
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:current?700:600,color:active?C.text:C.sub}}>{ph.name}</div>
                      <div style={{fontSize:12,color:C.sub}}>{ph.sub}</div>
                    </div>
                    {active && <span style={{fontSize:13,fontWeight:700,color:ph.clr,fontFamily:MONO}}>{ph.done}/{ph.total}</span>}
                  </div>
                  {active && <div style={{height:5,background:C.card,borderRadius:3,marginTop:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
                    <div style={{height:"100%",width:`${pct}%`,background:ph.clr,borderRadius:3,transition:"width 0.6s ease"}}/>
                  </div>}
                  {!active && <div style={{fontSize:11,color:C.sub,marginTop:4,fontStyle:"italic"}}>🔒 Complete Phase {ph.p-1} to unlock</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:14,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.4s ease 0.1s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>WEEKLY TARGET</div>
          <div style={{display:"flex",alignItems:"center",gap:14}}><input type="range" min={2} max={7} value={gi} onChange={e=>setGi(+e.target.value)} style={{flex:1}}/><div style={{width:40,height:40,borderRadius:12,background:"#FFF0F3",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MONO,fontSize:20,fontWeight:700,color:C.accent}}>{gi}</div></div>
          <button onClick={()=>{setWg({d:gi});if(userId)supaSaveSettings(userId,{weekly_goal_days:gi,reminder_days:rd,reminder_time:rt,reminder_on:rs});}} style={{background:C.accent,border:"none",color:"#fff",width:"100%",padding:13,borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",marginTop:14,fontFamily:SF}}>Update Goal</button>
        </div>
        <div style={{background:"#fff",borderRadius:16,padding:20,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.4s ease 0.15s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>🔔 REMINDERS</div>
          <div style={{display:"flex",gap:4,marginBottom:12}}>{DAYSFULL.map((d,i)=><button key={d} onClick={()=>{setRd(ds=>ds.includes(i)?ds.filter(x=>x!==i):[...ds,i]);setRs(false);}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:rd.includes(i)?C.accent:C.card,color:rd.includes(i)?"#fff":C.sub,fontSize:10,fontWeight:600,cursor:"pointer"}}>{DAYS[i]}</button>)}</div>
          <div style={{display:"flex",gap:8}}><input type="time" value={rt} onChange={e=>{setRt(e.target.value);setRs(false);}} style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:15,fontFamily:MONO}}/><button onClick={()=>{setRs(true);if(userId)supaSaveSettings(userId,{weekly_goal_days:wg.d,reminder_days:rd,reminder_time:rt,reminder_on:true});}} style={{background:rs?C.green:C.accent2,border:"none",color:"#fff",padding:"10px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer"}}>{rs?"✓":"Save"}</button></div>
        </div>
      </div>}

      {/* SUMMARY */}
      {scr==="summary"&&<div style={{padding:"0 20px",maxWidth:520,margin:"0 auto"}}>
        <div style={{padding:"46px 0 16px",animation:"fadeUp 0.4s ease"}}><h1 style={{fontSize:34,fontWeight:700,letterSpacing:-0.5}}>Summary</h1></div>
        <div style={{display:"flex",gap:5,marginBottom:16,animation:"fadeUp 0.4s ease 0.05s both"}}>{[{l:"7D",v:"7"},{l:"14D",v:"14"},{l:"30D",v:"30"},{l:"90D",v:"90"}].map(r=><button key={r.v} onClick={()=>setSr(r.v)} style={{flex:1,padding:"10px 4px",borderRadius:10,border:"none",cursor:"pointer",background:sr===r.v?C.accent:C.card,color:sr===r.v?"#fff":C.sub,fontSize:13,fontWeight:600,fontFamily:SF}}>{r.l}</button>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14,animation:"fadeUp 0.4s ease 0.1s both"}}>{[{l:"Workouts",v:stats.tw,c:C.accent},{l:"Exercises",v:stats.te,c:C.accent2},{l:"Avg Pain",v:stats.ap,c:parseFloat(stats.ap)>2?"#FF3B30":C.green},{l:"Avg Energy",v:stats.am,c:parseFloat(stats.am)>=3?C.green:"#FF9F0A"}].map((s,i)=><div key={i} style={{background:"#fff",border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:18,textAlign:"center"}}><div style={{fontFamily:MONO,fontSize:30,fontWeight:700,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:C.sub,fontWeight:600,marginTop:4}}>{s.l}</div></div>)}</div>
        <div style={{background:"#fff",border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:20,marginBottom:14,animation:"fadeUp 0.4s ease 0.15s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:10}}>PAIN TREND</div>
          {stats.e.length>=2?<><div style={{fontSize:15,fontWeight:700,color:stats.pt>0?C.green:stats.pt<0?"#FF3B30":C.sub,marginBottom:8}}>{stats.pt>0?"↓ Improving":stats.pt<0?"↑ Increased":"→ Stable"}</div><div style={{display:"flex",alignItems:"flex-end",gap:3,height:50}}>{stats.e.slice().reverse().map((e,i)=>{const p=e.checkin?.pain||0;return<div key={i} style={{flex:1,height:Math.max(5,(p/4)*44),borderRadius:3,background:p<=1?C.green:p<=2?"#FFD60A":p<=3?"#FF9F0A":"#FF3B30",minWidth:4}}/>})}</div></>:<div style={{fontSize:14,color:C.sub,textAlign:"center",padding:16}}>Complete 2+ check-ins to see trends</div>}
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:20,marginBottom:14,animation:"fadeUp 0.4s ease 0.2s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>WORKOUT LOG</div>
          {stats.e.length>0?stats.e.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<stats.e.length-1?`1px solid ${C.card}`:"none"}}><div><div style={{fontSize:14,fontWeight:600}}>{new Date(e.date+"T12:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div><div style={{fontSize:12,color:C.sub}}>Pain: {e.checkin?.pain} · {MOODS.find(m=>m.v===e.checkin?.mood)?.emoji}</div></div><div style={{background:"#FFF0F3",padding:"4px 10px",borderRadius:8,fontSize:13,fontWeight:600,color:C.accent}}>{e.completed?.length||0}</div></div>)
          :<div style={{fontSize:14,color:C.sub,textAlign:"center",padding:16}}>No workouts yet</div>}
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:20,marginBottom:14,animation:"fadeUp 0.4s ease 0.25s both"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.sub}}>🏥 KAISER PT PROGRAM</div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>Your Kaiser PT exercise program</div>
            </div>
            <a href="https://kpwa.medbridgego.com/lite/resources" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.accent2,textDecoration:"none",background:"#F0F4FF",padding:"4px 10px",borderRadius:6,fontWeight:600}}>MedBridge ↗</a>
          </div>
          {/* Clinician Notes */}
          <div style={{background:"#FFF8E1",borderRadius:10,padding:12,marginBottom:14,border:"1px solid #FFE082"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#F57F17",marginBottom:6}}>📋 CLINICIAN NOTES</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>
              <div style={{marginBottom:4}}>• Spend 6 min/day massaging front quad (rectus femoris) on <strong>RIGHT</strong> leg + 6 min massaging outside quad (vastus lateralis)</div>
              <div style={{marginBottom:4}}>• Skip ball hamstring exercises — replace with standing and bird dog variations</div>
            </div>
          </div>
          {/* Exercise List */}
          {(()=>{
            const kaiserExs = EXERCISES.filter(e => e.src && e.src.includes("Kaiser PT"));
            const phases = {1:"Phase 1 — Foundation 基础",2:"Phase 2 — Building 增强",3:"Phase 3 — Advanced 进阶"};
            return [1,2,3].map(phase => {
              const phaseExs = kaiserExs.filter(e => e.phase === phase);
              if (phaseExs.length === 0) return null;
              return (
                <div key={phase} style={{marginBottom:phase<3?16:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:phase===1?C.green:phase===2?C.accent2:C.accent,marginBottom:8,letterSpacing:0.3}}>{phases[phase]}</div>
                  {phaseExs.map((ex,i) => (
                    <div key={ex.id} onClick={()=>{setSelEx(ex);nav("exercise",{ex,from:"summary"});}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<phaseExs.length-1?`1px solid ${C.card}`:"none",cursor:"pointer"}}>
                      <div style={{width:30,height:30,borderRadius:10,background:phase===1?"#E8FAF0":phase===2?"#F0F4FF":"#FFF0F3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:phase===1?C.green:phase===2?C.accent2:C.accent,flexShrink:0}}>{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.name}</div>
                        <div style={{fontSize:12,color:C.sub}}>{ex.zh} · {ex.target}</div>
                        <div style={{fontSize:11,color:"#B0B0B5",marginTop:1}}>{ex.sets}×{ex.reps}{ex.hold>0?` · ${ex.hold}s hold`:""}{ex.gym?" · 🏢 Gym":""}</div>
                      </div>
                      <span style={{color:C.border,fontSize:14,flexShrink:0}}>›</span>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
          <div style={{marginTop:14,padding:12,background:C.card,borderRadius:10,fontSize:12,color:C.sub,lineHeight:1.5,textAlign:"center"}}>
            Exercises may be updated by your PT at each visit. Tap any exercise above for full instructions, video, and timer.
            <br/>每次就诊时，PT可能会更新练习内容。点击上方任何练习查看详细说明。
          </div>
        </div>
        {/* All Exercises Library */}
        <div style={{background:"#fff",border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:20,marginBottom:14,animation:"fadeUp 0.4s ease 0.28s both"}}>
          <div onClick={()=>setLibOpen(o=>!o)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.sub}}>📖 FULL EXERCISE LIBRARY ({EXERCISES.length} exercises)</div>
            <span style={{fontSize:16,color:C.sub,transition:"transform 0.2s",transform:libOpen?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
          </div>
          {!libOpen&&<div style={{fontSize:12,color:C.sub,marginTop:8}}>Tap to expand all exercises · 点击展开所有练习</div>}
          {libOpen&&<div style={{marginTop:14}}>
          {(()=>{
            const groups = [
              {label:"🦵 Knee Rehab 膝关节",filter:e=>e.safeFor.includes("knee")&&!e.safeFor.includes("upper")},
              {label:"🦶 Ankle Rehab 脚踝",filter:e=>e.safeFor.includes("ankle")&&!e.safeFor.includes("knee")&&!e.safeFor.includes("upper")},
              {label:"🦵🦶 Knee + Ankle 膝踝",filter:e=>e.safeFor.includes("knee")&&e.safeFor.includes("ankle")&&!e.safeFor.includes("upper")},
              {label:"💪 Upper Body 上肢",filter:e=>e.safeFor.includes("upper")&&!e.safeFor.includes("knee")},
              {label:"🏋️ Full Body 全身",filter:e=>e.safeFor.includes("upper")&&(e.safeFor.includes("knee")||e.safeFor.includes("ankle"))},
            ];
            return groups.map((g,gi) => {
              const exs = EXERCISES.filter(g.filter);
              if(exs.length===0) return null;
              return (
                <div key={gi} style={{marginBottom:gi<groups.length-1?14:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.accent2,marginBottom:6}}>{g.label}</div>
                  {exs.map((ex,i) => (
                    <div key={ex.id} onClick={()=>{setSelEx(ex);nav("exercise",{ex,from:"summary"});}} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<exs.length-1?`1px solid ${C.card}`:"none",cursor:"pointer"}}>
                      <div style={{fontSize:12,fontWeight:600,color:ex.src?.includes("Kaiser")?C.accent:C.sub,flexShrink:0,width:14,textAlign:"center"}}>{ex.src?.includes("Kaiser")?"K":"•"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.name} <span style={{color:C.sub,fontSize:12}}>{ex.zh}</span></div>
                      </div>
                      <div style={{fontSize:10,color:C.sub,fontFamily:MONO,flexShrink:0}}>{ex.sets}×{ex.reps}</div>
                      {ex.gym&&<span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:"#F0F4FF",color:C.accent2,fontWeight:700,flexShrink:0}}>GYM</span>}
                      <span style={{color:C.border,fontSize:12,flexShrink:0}}>›</span>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
          </div>}
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:20,animation:"fadeUp 0.4s ease 0.3s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>📚 CLINICAL REFERENCES</div>
          {SOURCES.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{display:"block",padding:"8px 0",borderBottom:i<SOURCES.length-1?`1px solid ${C.card}`:"none",textDecoration:"none"}}><div style={{fontSize:14,fontWeight:600,color:C.accent2}}>{s.org}</div><div style={{fontSize:13,color:C.sub,marginTop:1}}>{s.desc} ↗</div></a>)}
        </div>
      </div>}

      {/* PROFILE */}
      {scr==="profile"&&<div style={{padding:"0 20px",maxWidth:520,margin:"0 auto"}}>
        <div style={{padding:"46px 0 16px",animation:"fadeUp 0.4s ease"}}>
          <h1 style={{fontSize:34,fontWeight:700,letterSpacing:-0.5}}>{profile.saved?"Your Profile":"Welcome"}</h1>
          <p style={{fontSize:15,color:C.sub}}>{profile.saved?"Update your info anytime":"Tell me about yourself so I can personalize your training"}</p>
          <p style={{fontSize:13,color:C.sub}}>{profile.saved?"随时更新信息":"请告诉我你的基本信息，以便定制训练计划"}</p>
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:12,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.35s ease 0.05s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:0.5,marginBottom:14}}>BASIC INFO 基本信息</div>
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}>
              <label style={{fontSize:12,fontWeight:600,color:C.sub,display:"block",marginBottom:4}}>Age 年龄</label>
              <input type="number" value={profile.age} onChange={e=>setProfile(p=>({...p,age:e.target.value}))} placeholder="30"
                style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:16,fontFamily:SF,color:C.text,outline:"none",background:"#fff"}}/>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:12,fontWeight:600,color:C.sub,display:"block",marginBottom:4}}>Height 身高 (cm)</label>
              <input type="number" value={profile.height} onChange={e=>setProfile(p=>({...p,height:e.target.value}))} placeholder="165"
                style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:16,fontFamily:SF,color:C.text,outline:"none",background:"#fff"}}/>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:12,fontWeight:600,color:C.sub,display:"block",marginBottom:4}}>Weight 体重 (kg)</label>
              <input type="number" value={profile.weight} onChange={e=>setProfile(p=>({...p,weight:e.target.value}))} placeholder="55"
                style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:16,fontFamily:SF,color:C.text,outline:"none",background:"#fff"}}/>
            </div>
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:12,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.35s ease 0.1s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:0.5,marginBottom:14}}>GENDER 性别</div>
          <div style={{display:"flex",gap:8}}>
            {[{id:"female",label:"Female 女",em:"👩"},{id:"male",label:"Male 男",em:"👨"}].map(g=>(
              <button key={g.id} onClick={()=>setProfile(p=>({...p,gender:g.id}))} style={{flex:1,padding:"14px 8px",borderRadius:14,cursor:"pointer",background:profile.gender===g.id?"#FFF0F3":"#fff",border:profile.gender===g.id?`2px solid ${C.accent}`:`1.5px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontSize:26,marginBottom:4}}>{g.em}</div>
                <div style={{fontSize:13,color:profile.gender===g.id?C.accent:C.sub,fontWeight:600}}>{g.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:12,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.35s ease 0.15s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:0.5,marginBottom:14}}>FITNESS LEVEL 健身水平</div>
          <div style={{display:"flex",gap:6}}>
            {[
              {id:"beginner",label:"Beginner",zh:"初学者",desc:"New to exercise or recovering",em:"🌱"},
              {id:"intermediate",label:"Intermediate",zh:"中级",desc:"Some experience, moderate strength",em:"💪"},
              {id:"advanced",label:"Advanced",zh:"高级",desc:"Regular training background",em:"🔥"},
            ].map(l=>(
              <button key={l.id} onClick={()=>setProfile(p=>({...p,level:l.id}))} style={{flex:1,padding:"14px 6px",borderRadius:14,cursor:"pointer",background:profile.level===l.id?"#FFF0F3":"#fff",border:profile.level===l.id?`2px solid ${C.accent}`:`1.5px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:4}}>{l.em}</div>
                <div style={{fontSize:12,fontWeight:700,color:profile.level===l.id?C.accent:C.text}}>{l.label}</div>
                <div style={{fontSize:10,color:C.sub,marginTop:2}}>{l.zh}</div>
              </button>
            ))}
          </div>
          {profile.level==="beginner"&&<div style={{background:"#F0F4FF",borderRadius:10,padding:12,marginTop:12,fontSize:13,color:C.accent2}}>
            ✓ Great — I'll recommend gentler exercises, lower reps, and skip anything requiring significant upper/lower body strength. 我会推荐更温和的练习。
          </div>}
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:12,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.35s ease 0.2s both"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:0.5,marginBottom:14}}>GYM ACCESS 健身房</div>
          <div style={{display:"flex",gap:8}}>
            {[{id:true,label:"Yes, I have gym access",zh:"有健身房",em:"🏢"},{id:false,label:"Home workouts only",zh:"只在家训练",em:"🏠"}].map(g=>(
              <button key={String(g.id)} onClick={()=>setProfile(p=>({...p,hasGym:g.id}))} style={{flex:1,padding:"16px 8px",borderRadius:14,cursor:"pointer",background:profile.hasGym===g.id?"#FFF0F3":"#fff",border:profile.hasGym===g.id?`2px solid ${C.accent}`:`1.5px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:4}}>{g.em}</div>
                <div style={{fontSize:12,color:profile.hasGym===g.id?C.accent:C.sub,fontWeight:600}}>{g.label}</div>
                <div style={{fontSize:11,color:C.sub}}>{g.zh}</div>
              </button>
            ))}
          </div>
          {profile.hasGym&&<div style={{background:"#E8FAF0",borderRadius:10,padding:12,marginTop:12,fontSize:13,color:C.green}}>
            ✓ I'll include machine exercises like leg press, lat pulldown, and seated rows — machines are great for beginners because they guide your form. 会加入器械训练。
          </div>}
        </div>

        {/* BMI display if data entered */}
        {profile.height&&profile.weight&&(()=>{
          const h=parseFloat(profile.height)/100;const w=parseFloat(profile.weight);
          if(!h||!w)return null;
          const bmi=(w/(h*h)).toFixed(1);
          const cat=bmi<18.5?"Underweight":bmi<25?"Normal":bmi<30?"Overweight":"Obese";
          const clr=bmi<18.5?C.orange:bmi<25?C.green:bmi<30?C.orange:"#FF3B30";
          return(
            <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:12,border:`1px solid ${C.cardBorder}`,animation:"fadeUp 0.35s ease 0.25s both"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:0.5,marginBottom:10}}>YOUR BMI</div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{fontSize:36,fontWeight:700,color:clr,fontFamily:MONO}}>{bmi}</div>
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:C.text}}>{cat}</div>
                  <div style={{fontSize:12,color:C.sub}}>BMI is a rough guide — your trainer considers all factors</div>
                </div>
              </div>
            </div>
          );
        })()}

        <button onClick={()=>{const np={...profile,saved:true};setProfile(np);if(userId)supaSaveProfile(userId,np);nav("checkin");}}
          disabled={!profile.age||!profile.height||!profile.weight}
          style={{background:C.accent,border:"none",color:"#fff",width:"100%",padding:16,borderRadius:14,fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,opacity:(!profile.age||!profile.height||!profile.weight)?0.4:1,animation:"fadeUp 0.4s ease 0.3s both"}}>
          {profile.saved?"Save Changes":"Start My Journey →"}
        </button>

        {profile.saved&&<button onClick={()=>nav("checkin")}
          style={{background:"transparent",border:`1.5px solid ${C.border}`,color:C.sub,width:"100%",padding:14,borderRadius:14,fontSize:15,cursor:"pointer",fontFamily:SF,marginTop:8}}>
          Back to Check-in
        </button>}
      </div>}
    </div>

    <AIChatbot/>
    <MuscleModal muscle={selM} onClose={()=>setSelM(null)}/>
  </div>);
}
