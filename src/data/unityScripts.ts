export interface UnityScriptItem {
  filename: string;
  category: 'Physics & Controller' | 'Input & Wind' | 'Gameplay & Progression' | 'Cultural & Visuals' | 'Project Settings & Build';
  description: string;
  code: string;
}

export const UNITY_SCRIPTS: UnityScriptItem[] = [
  {
    filename: 'LanternPhysicsController.cs',
    category: 'Physics & Controller',
    description: 'Điều khiển vật lý 2D cho đèn lồng: Lực nâng buoyancy, quán tính gió, góc nghiêng chao đảo, dây tua rua và độ bền (Health/Damage) khi va chạm.',
    code: `// LanternPhysicsController.cs
// Unity 2022.3+ LTS / Unity 6 Compatible (2D Physics & URP 2D Light)
using UnityEngine;
using UnityEngine.Events;

[RequireComponent(typeof(Rigidbody2D))]
[RequireComponent(typeof(CircleCollider2D))]
public class LanternPhysicsController : MonoBehaviour
{
    [Header("--- Thuộc Tính Vật Lý Đèn Lồng ---")]
    [Tooltip("Lực nâng tự nhiên của khí nóng bên trong đèn (Buoyancy)")]
    public float buoyancyForce = 2.4f;
    
    [Tooltip("Lực cản không khí khi đèn bay lơ lửng")]
    public float airDrag = 1.2f;

    [Tooltip("Góc nghiêng tối đa khi có luồng gió thổi qua")]
    public float maxTiltAngle = 35f;

    [Tooltip("Tốc độ cân bằng lại thế đứng thẳng")]
    public float uprightTorque = 4.0f;

    [Header("--- Độ Bền & Va Chạm ---")]
    public float maxHealth = 100f;
    public float currentHealth;
    public float minDamageThreshold = 2.5f;
    public float damageMultiplier = 12f;

    [Header("--- Hiệu Ứng Ánh Sáng & Hạt ---")]
    [Tooltip("UnityEngine.Rendering.Universal.Light2D (URP)")]
    public UnityEngine.Rendering.Universal.Light2D lanternLight;
    public ParticleSystem collisionSparks;
    public ParticleSystem flameExtinguishFX;
    public Transform tasselAnchor;

    [Header("--- Sự Kiện ---")]
    public UnityEvent<float> onHealthChanged;
    public UnityEvent onLanternDestroyed;
    public UnityEvent<Vector2> onWindForceReceived;

    private Rigidbody2D rb;
    private CircleCollider2D col;
    private bool isDestroyed = false;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        col = GetComponent<CircleCollider2D>();
        currentHealth = maxHealth;
        rb.drag = airDrag;
        rb.gravityScale = 0.35f; // Trọng lực nhẹ, cân bằng với buoyancy
    }

    void FixedUpdate()
    {
        if (isDestroyed) return;

        // 1. Áp dụng lực đẩy nổi khinh khí (Thermal Buoyancy)
        rb.AddForce(Vector2.up * buoyancyForce, ForceMode2D.Force);

        // 2. Tự động xoay về phương thẳng đứng (Self-Righting Torque)
        float currentAngle = transform.eulerAngles.z;
        if (currentAngle > 180f) currentAngle -= 360f;
        float uprightForce = -currentAngle * uprightTorque;
        rb.AddTorque(uprightForce * Mathf.Deg2Rad, ForceMode2D.Force);

        // 3. Giới hạn vận tốc xoay tối đa để tránh bị lật nhào phi thực tế
        rb.angularVelocity = Mathf.Clamp(rb.angularVelocity, -180f, 180f);

        // 4. Hiệu ứng nhấp nháy ngọn nến tự nhiên
        if (lanternLight != null)
        {
            lanternLight.intensity = Mathf.Lerp(lanternLight.intensity, 1.4f + Mathf.Sin(Time.time * 8f) * 0.15f, Time.fixedDeltaTime * 5f);
        }
    }

    /// <summary>
    /// Nhận xung lực từ cử chỉ vuốt ngón tay tạo gió
    /// </summary>
    public void ApplyWindImpulse(Vector2 windVelocity, float proximityFactor)
    {
        if (isDestroyed) return;

        Vector2 impulse = windVelocity * proximityFactor;
        rb.AddForce(impulse, ForceMode2D.Impulse);

        // Tạo độ nghiêng tự nhiên theo hướng gió
        float tiltDir = -Mathf.Sign(windVelocity.x) * Mathf.Clamp(windVelocity.magnitude * 2f, 0f, maxTiltAngle);
        rb.AddTorque(tiltDir * 0.5f, ForceMode2D.Impulse);

        onWindForceReceived?.Invoke(impulse);
    }

    void OnCollisionEnter2D(Collision2D collision)
    {
        if (isDestroyed) return;

        float impactForce = collision.relativeVelocity.magnitude;
        if (impactForce > minDamageThreshold)
        {
            float damage = (impactForce - minDamageThreshold) * damageMultiplier;
            TakeDamage(damage);

            if (collisionSparks != null)
            {
                collisionSparks.transform.position = collision.contacts[0].point;
                collisionSparks.Play();
            }
        }
    }

    public void TakeDamage(float amount)
    {
        currentHealth = Mathf.Max(0f, currentHealth - amount);
        onHealthChanged?.Invoke(currentHealth / maxHealth);

        if (currentHealth <= 0f && !isDestroyed)
        {
            DestroyLantern();
        }
    }

    private void DestroyLantern()
    {
        isDestroyed = true;
        if (flameExtinguishFX != null) flameExtinguishFX.Play();
        if (lanternLight != null) lanternLight.enabled = false;
        rb.gravityScale = 1.0f; // Rơi tự do khi nến tắt
        onLanternDestroyed?.Invoke();
    }
}`,
  },
  {
    filename: 'WindSwipeSystem.cs',
    category: 'Input & Wind',
    description: 'Hệ thống vuốt ngón tay cảm ứng trên màn hình điện thoại (Touch / Mouse swipe) tạo vệt gió lụa (LineRenderer) và truyền lực đẩy cho đèn lồng.',
    code: `// WindSwipeSystem.cs
// Unity Mobile Touch / Mouse Swipe Controller for Hyper-casual Wind Physics
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

public class WindSwipeSystem : MonoBehaviour
{
    [Header("--- Tham Số Luồng Gió ---")]
    [Tooltip("Hệ số khuếch đại lực vuốt gió")]
    public float windForceMultiplier = 0.08f;

    [Tooltip("Khoảng cách tối đa mà luồng gió tác động đến đèn lồng")]
    public float windEffectRadius = 4.5f;

    [Tooltip("Khoảng cách vuốt tối thiểu để kích hoạt gió")]
    public float minSwipeDistance = 0.5f;

    [Tooltip("Thời gian tồn tại của vệt gió trên màn hình")]
    public float trailDuration = 0.45f;

    [Header("--- Tham Chiếu ---")]
    public LanternPhysicsController targetLantern;
    public LineRenderer windTrailPrefab;
    public Camera mainCam;

    [Header("--- Giới Hạn Lượt Vuốt (Gusts) ---")]
    public int maxGusts = 4;
    public int currentGustsLeft;
    public UnityEvent<int> onGustUsed;

    private Vector2 touchStartPos;
    private float touchStartTime;
    private bool isSwiping = false;
    private LineRenderer activeTrail;
    private List<Vector3> trailPoints = new List<Vector3>();

    void Start()
    {
        if (mainCam == null) mainCam = Camera.main;
        currentGustsLeft = maxGusts;
    }

    void Update()
    {
        HandleInput();
    }

    void HandleInput()
    {
        if (currentGustsLeft <= 0) return;

        // Xử lý cảm ứng chạm điện thoại (Mobile Touch) hoặc chuột (Editor/Web)
        bool pointerDown = Input.GetMouseButtonDown(0) || (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began);
        bool pointerStay = Input.GetMouseButton(0) || (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Moved);
        bool pointerUp   = Input.GetMouseButtonUp(0) || (Input.touchCount > 0 && (Input.GetTouch(0).phase == TouchPhase.Ended || Input.GetTouch(0).phase == TouchPhase.Canceled));

        Vector2 screenPos = Input.touchCount > 0 ? Input.GetTouch(0).position : (Vector2)Input.mousePosition;
        Vector3 worldPos = mainCam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, -mainCam.transform.position.z));
        worldPos.z = 0;

        if (pointerDown)
        {
            isSwiping = true;
            touchStartPos = worldPos;
            touchStartTime = Time.time;

            if (windTrailPrefab != null)
            {
                activeTrail = Instantiate(windTrailPrefab, Vector3.zero, Quaternion.identity);
                trailPoints.Clear();
                trailPoints.Add(worldPos);
                activeTrail.positionCount = 1;
                activeTrail.SetPosition(0, worldPos);
            }
        }
        else if (pointerStay && isSwiping)
        {
            if (activeTrail != null && Vector3.Distance(trailPoints[trailPoints.Count - 1], worldPos) > 0.15f)
            {
                trailPoints.Add(worldPos);
                activeTrail.positionCount = trailPoints.Count;
                activeTrail.SetPositions(trailPoints.ToArray());
            }
        }
        else if (pointerUp && isSwiping)
        {
            isSwiping = false;
            Vector2 touchEndPos = worldPos;
            float swipeDuration = Mathf.Max(0.04f, Time.time - touchStartTime);
            Vector2 swipeDelta = touchEndPos - touchStartPos;

            if (swipeDelta.magnitude >= minSwipeDistance)
            {
                ExecuteWindGust(touchStartPos, touchEndPos, swipeDelta, swipeDuration);
            }

            if (activeTrail != null)
            {
                Destroy(activeTrail.gameObject, trailDuration);
            }
        }
    }

    void ExecuteWindGust(Vector2 start, Vector2 end, Vector2 delta, float duration)
    {
        Vector2 swipeVelocity = (delta / duration) * windForceMultiplier;

        if (targetLantern != null)
        {
            Vector2 lanternPos = targetLantern.transform.position;
            // Tính khoảng cách gần nhất từ đèn đến đoạn thẳng vuốt gió
            float distanceToSwipe = DistancePointToSegment(lanternPos, start, end);

            if (distanceToSwipe <= windEffectRadius)
            {
                float proximityFactor = 1.0f - (distanceToSwipe / windEffectRadius);
                targetLantern.ApplyWindImpulse(swipeVelocity, proximityFactor);
            }
        }

        currentGustsLeft--;
        onGustUsed?.Invoke(currentGustsLeft);

        // Kích hoạt phản hồi rung trên di động (Mobile Haptic Feedback)
        #if UNITY_ANDROID || UNITY_IOS
        Handheld.Vibrate();
        #endif
    }

    private float DistancePointToSegment(Vector2 p, Vector2 a, Vector2 b)
    {
        Vector2 pa = p - a, ba = b - a;
        float h = Mathf.Clamp01(Vector2.Dot(pa, ba) / Vector2.Dot(ba, ba));
        return (pa - ba * h).magnitude;
    }
}`,
  },
  {
    filename: 'PatternCollectible.cs',
    category: 'Cultural & Visuals',
    description: 'Đối tượng hoa văn truyền thống (Hội An Silk / Hanok Dancheong / Taegeuk): Chuyển động lơ lửng, phát sáng hào quang, thu thập mở khóa danh hiệu văn hóa.',
    code: `// PatternCollectible.cs
// Cultural Artifact & Collectible Script with Floating Motion & Trivia Event
using UnityEngine;
using UnityEngine.Events;

[RequireComponent(typeof(CircleCollider2D))]
public class PatternCollectible : MonoBehaviour
{
    [Header("--- Thông Tin Văn Hóa ---")]
    public string patternId = "hoian_silk_01";
    public string patternName = "Họa Tiết Sen Đại Việt";
    [TextArea(2, 4)]
    public string culturalStory = "Hoa sen tượng trưng cho sự thuần khiết, xuất hiện trên đồ gốm và lụa truyền thống từ thời Lý - Trần.";
    public enum CulturalOrigin { Vietnam_HoiAn, Korea_Hanok, Convergence }
    public CulturalOrigin origin;

    [Header("--- Hiệu Ứng Trực Quan ---")]
    public float floatAmplitude = 0.15f;
    public float floatFrequency = 2.0f;
    public float rotationSpeed = 25f;
    public ParticleSystem collectParticleFX;
    public AudioClip collectSound;

    [Header("--- Sự Kiện ---")]
    public UnityEvent<PatternCollectible> onCollected;

    private Vector3 initialPos;
    private bool isCollected = false;

    void Start()
    {
        initialPos = transform.position;
        GetComponent<CircleCollider2D>().isTrigger = true;
    }

    void Update()
    {
        if (isCollected) return;

        // Chuyển động lơ lửng nhẹ nhàng bồng bềnh
        float newY = initialPos.y + Mathf.Sin(Time.time * floatFrequency) * floatAmplitude;
        transform.position = new Vector3(initialPos.x, newY, initialPos.z);
        transform.Rotate(Vector3.forward, rotationSpeed * Time.deltaTime);
    }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (isCollected) return;

        if (other.GetComponent<LanternPhysicsController>() != null)
        {
            Collect();
        }
    }

    public void Collect()
    {
        isCollected = true;
        if (collectParticleFX != null)
        {
            collectParticleFX.transform.SetParent(null);
            collectParticleFX.Play();
            Destroy(collectParticleFX.gameObject, 1.5f);
        }

        if (collectSound != null)
        {
            AudioSource.PlayClipAtPoint(collectSound, transform.position, 1.0f);
        }

        onCollected?.Invoke(this);
        gameObject.SetActive(false);
    }
}`,
  },
  {
    filename: 'FestivalGoal.cs',
    category: 'Gameplay & Progression',
    description: 'Cổng Lễ Hội Hoa Đăng (Hội An Ancient Festival / Hanok Lantern Gateway): Khu vực đích đến an toàn, kích hoạt pháo hoa chúc mừng và chuyển màn.',
    code: `// FestivalGoal.cs
// Destination Target Altar / Festival Gate Trigger
using UnityEngine;
using UnityEngine.Events;

[RequireComponent(typeof(CircleCollider2D))]
public class FestivalGoal : MonoBehaviour
{
    [Header("--- Thiết Lập Đích Đến ---")]
    public float targetRadius = 1.2f;
    public float requiredStayTime = 0.4f; // Phải hạ cánh/lơ lửng ổn định trong đích
    public ParticleSystem fireworksParticles;
    public AudioClip victoryFanfare;

    [Header("--- Sự Kiện ---")]
    public UnityEvent onGoalReached;

    private float timerInZone = 0f;
    private bool isSuccess = false;

    void Start()
    {
        CircleCollider2D col = GetComponent<CircleCollider2D>();
        col.isTrigger = true;
        col.radius = targetRadius;
    }

    void OnTriggerStay2D(Collider2D other)
    {
        if (isSuccess) return;

        var lantern = other.GetComponent<LanternPhysicsController>();
        if (lantern != null)
        {
            timerInZone += Time.deltaTime;
            if (timerInZone >= requiredStayTime)
            {
                TriggerVictory();
            }
        }
    }

    void OnTriggerExit2D(Collider2D other)
    {
        if (isSuccess) return;
        timerInZone = 0f;
    }

    private void TriggerVictory()
    {
        isSuccess = true;
        if (fireworksParticles != null) fireworksParticles.Play();
        if (victoryFanfare != null) AudioSource.PlayClipAtPoint(victoryFanfare, transform.position);

        onGoalReached?.Invoke();
    }
}`,
  },
  {
    filename: 'LevelManager.cs',
    category: 'Gameplay & Progression',
    description: 'Quản lý logic màn chơi, tính sao (1-3 Sao) dựa trên số mảnh hoa văn, lượt gió còn lại và độ bền đèn lồng.',
    code: `// LevelManager.cs
// Handles Game Rules, Star Rating Calculation, and Scene Flow
using UnityEngine;
using UnityEngine.SceneManagement;

public class LevelManager : MonoBehaviour
{
    public static LevelManager Instance { get; private set; }

    [Header("--- Quản Lý Trạng Thái ---")]
    public int currentLevelIndex = 1;
    public int patternsCollected = 0;
    public int totalPatternsInLevel = 3;

    public WindSwipeSystem windSystem;
    public LanternPhysicsController lantern;
    public FestivalGoal festivalGoal;

    public GameObject victoryUIPanel;
    public GameObject defeatUIPanel;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    void Start()
    {
        if (festivalGoal != null)
            festivalGoal.onGoalReached.AddListener(OnLevelClear);

        if (lantern != null)
            lantern.onLanternDestroyed.AddListener(OnLevelFailed);
    }

    public void OnPatternPicked(PatternCollectible pattern)
    {
        patternsCollected++;
    }

    public void OnLevelClear()
    {
        int stars = CalculateStars();
        SaveProgress(currentLevelIndex, stars);

        if (victoryUIPanel != null) victoryUIPanel.SetActive(true);
    }

    public void OnLevelFailed()
    {
        if (defeatUIPanel != null) defeatUIPanel.SetActive(true);
    }

    public int CalculateStars()
    {
        int stars = 1; // Hoàn thành đến đích
        if (patternsCollected >= totalPatternsInLevel) stars++; // Nhặt đủ 3 hoa văn
        if (windSystem.currentGustsLeft >= 1 && (lantern.currentHealth / lantern.maxHealth) > 0.5f) stars++; // Tiết kiệm gió & đèn nguyên vẹn
        return stars;
    }

    private void SaveProgress(int level, int stars)
    {
        int prevStars = PlayerPrefs.GetInt("Level_" + level + "_Stars", 0);
        if (stars > prevStars)
        {
            PlayerPrefs.SetInt("Level_" + level + "_Stars", stars);
            PlayerPrefs.Save();
        }
    }

    public void RestartLevel()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }

    public void LoadNextLevel()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1);
    }
}`,
  },
  {
    filename: 'UnityProjectSetupGuide.md',
    category: 'Project Settings & Build',
    description: 'Hướng dẫn từng bước cấu hình Unity 2D (URP), Android APK và iOS export để phát hành lên Google Play & App Store.',
    code: `# Hướng Dẫn Thiết Lập Dự Án Unity Cho "LANTERN LINK" Trên Di Động (iOS & Android)

### 1. Khởi Tạo Dự Án Unity:
- Khởi động Unity Hub -> Chọn **New Project**.
- Chọn mẫu **2D (URP)** - Universal Render Pipeline.
- Đặt tên: \`LanternLink_Mobile\`.
- Đề xuất phiên bản Unity: Unity 2022.3 LTS hoặc Unity 6 LTS.

### 2. Cài Đặt Hệ Thống Chiếu Sáng 2D (2D Lights):
- Vì game có tính năng ánh sáng ban đêm lộng lẫy (Đèn lồng Hội An & Hanok tỏa ánh sáng ấm soi đường):
  - Chuột phải trong Hierarchy: **Light > 2D > Freeform Light 2D** hoặc **Point Light 2D**.
  - Gán vào đối tượng \`Lantern\`. Chỉnh Inner Radius = 0.5, Outer Radius = 3.5, Color = Vàng hổ phách (#F59E0B) hoặc Đỏ/Xanh.
  - Global Light 2D chỉnh màu xanh thẫm đêm tối (#0B1026, Intensity = 0.25) để ánh đèn lồng nổi bật rực rỡ!

### 3. Cấu Hình Build Di Động:
#### Cho Android (Google Play Store):
1. **File > Build Settings** -> Chọn **Android** -> Nhấn **Switch Platform**.
2. Mở **Player Settings**:
   - **Company Name**: Tên studio của bạn.
   - **Product Name**: Lantern Link - Hành Trình Của Những Chiếc Đèn.
   - **Default Orientation**: Portrait hoặc Landscape (Game hỗ trợ chuẩn Landscape 16:9 hoặc xoay tự do).
   - **Target API Level**: Android 14 (API 34) trở lên theo chuẩn Google Play.
   - **Scripting Backend**: IL2CPP.
   - **Target Architectures**: ARMv7 và ARM64 (Bắt buộc cho Google Play).
3. Tích chọn **Build App Bundle (.aab)** khi sẵn sàng đăng tải lên Google Play Console.

#### Cho iOS (Apple App Store):
1. Chuyển platform sang **iOS**.
2. **Player Settings**:
   - Bundle Identifier: \`com.yourstudio.lanternlink\`.
   - Target SDK: Device SDK.
   - Requires Full Screen: Checked.
3. Nhấn Build để tạo Xcode Project -> Mở Xcode -> Ký chứng chỉ (Signing & Capabilities) -> Archive lên TestFlight/App Store.
`,
  },
];
